import axios, { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';
import { createAxiosInstance } from './core';

export interface CompleteVideoSource {
  url: string;
  server: string;
  quality: string;
  language: 'VF' | 'VOSTFR';
  type: 'iframe' | 'direct';
  serverIndex: number;
}

/**
 * Extracteur complet pour tous types de contenu anime-sama.fr (séries, films, OAV, etc.)
 */
export class CompleteVideoExtractor {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = createAxiosInstance();
  }

  /**
   * Extraction universelle depuis n'importe quelle page anime-sama.fr
   */
  public async extractFromAnimeSamaPage(pageUrl: string, language: 'VF' | 'VOSTFR'): Promise<CompleteVideoSource[]> {
    const sources: CompleteVideoSource[] = [];
    
    try {
      console.log(`Extraction complète depuis: ${pageUrl}`);
      
      const response = await this.axiosInstance.get(pageUrl, {
        headers: {
          'Referer': 'https://anime-sama.fr/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (response.status !== 200) {
        return sources;
      }

      const pageContent = response.data;
      const $ = cheerio.load(pageContent);
      
      // Méthode 1: Extraction des fichiers episodes.js
      await this.extractFromEpisodesFiles(pageContent, pageUrl, language, sources);
      
      // Méthode 2: Extraction des iframes directes
      this.extractDirectIframes($, language, sources);
      
      // Méthode 3: Extraction depuis les scripts JavaScript
      this.extractFromJavaScript(pageContent, language, sources);
      
      // Méthode 4: Extraction des patterns de serveurs populaires
      this.extractServerPatterns(pageContent, language, sources);
      
      // Méthode 5: Exploration des liens internes
      await this.exploreInternalLinks($, pageUrl, language, sources);
      
      console.log(`Total sources extraites: ${sources.length}`);
      return this.deduplicateSources(sources);

    } catch (error: any) {
      console.error('Erreur extraction complète:', error.message);
      return sources;
    }
  }

  /**
   * Extraction depuis les fichiers episodes.js (méthode principale pour les séries)
   */
  private async extractFromEpisodesFiles(pageContent: string, baseUrl: string, language: 'VF' | 'VOSTFR', sources: CompleteVideoSource[]): Promise<void> {
    const episodesJsPattern = /episodes\.js\?filever=(\d+)/g;
    let match;
    
    while ((match = episodesJsPattern.exec(pageContent)) !== null) {
      try {
        const filever = match[1];
        const episodesJsUrl = `${baseUrl}/episodes.js?filever=${filever}`;
        
        const episodesResponse = await this.axiosInstance.get(episodesJsUrl, {
          headers: { 'Referer': baseUrl }
        });
        
        if (episodesResponse.data) {
          this.parseEpisodesJsContent(episodesResponse.data, language, sources);
        }
      } catch (error) {
        continue;
      }
    }
  }

  /**
   * Parse le contenu d'un fichier episodes.js
   */
  private parseEpisodesJsContent(episodesData: string, language: 'VF' | 'VOSTFR', sources: CompleteVideoSource[]): void {
    const serverArrays = ['eps1', 'eps2', 'eps3', 'eps4', 'epsAS'];
    
    serverArrays.forEach((serverName, serverIndex) => {
      const arrayRegex = new RegExp(`var ${serverName}\\s*=\\s*\\[(.*?)\\];`, 'gs');
      const match = arrayRegex.exec(episodesData);
      
      if (match) {
        const arrayContent = match[1];
        const urls = this.parseJavaScriptArray(arrayContent);
        
        urls.forEach((url, index) => {
          if (this.isValidVideoSource(url)) {
            sources.push({
              url: this.normalizeUrl(url),
              server: this.identifyServer(url, serverIndex + 1),
              quality: this.detectQuality(url),
              language,
              type: this.getSourceType(url),
              serverIndex: serverIndex + 1
            });
          }
        });
      }
    });
  }

  /**
   * Extraction des iframes directes depuis la page
   */
  private extractDirectIframes($: cheerio.CheerioAPI, language: 'VF' | 'VOSTFR', sources: CompleteVideoSource[]): void {
    $('iframe[src]').each((index, element) => {
      const src = $(element).attr('src');
      if (src && this.isValidVideoSource(src)) {
        sources.push({
          url: this.normalizeUrl(src),
          server: this.identifyServer(src, index + 1),
          quality: this.detectQuality(src),
          language,
          type: 'iframe',
          serverIndex: index + 1
        });
      }
    });
  }

  /**
   * Extraction depuis les scripts JavaScript
   */
  private extractFromJavaScript(pageContent: string, language: 'VF' | 'VOSTFR', sources: CompleteVideoSource[]): void {
    const patterns = [
      /(https?:\/\/[^\s"']+\.(?:mp4|m3u8|webm|avi|mkv))/gi,
      /(https?:\/\/video\.sibnet\.ru\/shell\.php\?videoid=\d+)/gi,
      /(https?:\/\/[^"\s']+(?:embed|player|watch)[^"\s']*)/gi
    ];

    patterns.forEach(pattern => {
      const matches = pageContent.match(pattern);
      if (matches) {
        matches.forEach((match: string) => {
          if (this.isValidVideoSource(match) && !sources.some(s => s.url === match)) {
            sources.push({
              url: match,
              server: this.identifyServer(match, sources.length + 1),
              quality: this.detectQuality(match),
              language,
              type: this.getSourceType(match),
              serverIndex: sources.length + 1
            });
          }
        });
      }
    });
  }

  /**
   * Extraction des patterns de serveurs populaires
   */
  private extractServerPatterns(pageContent: string, language: 'VF' | 'VOSTFR', sources: CompleteVideoSource[]): void {
    const serverPatterns = [
      /(?:sibnet|vidmoly|sendvid|doodstream|mixdrop|uqload|streamtape)\.(?:com|ru|to)\/[^"\s'<>]+/gi
    ];

    serverPatterns.forEach(pattern => {
      const matches = pageContent.match(pattern);
      if (matches) {
        matches.forEach((match: string) => {
          if (this.isValidVideoSource(match) && !sources.some(s => s.url === match)) {
            sources.push({
              url: this.normalizeUrl(match),
              server: this.identifyServer(match, sources.length + 1),
              quality: this.detectQuality(match),
              language,
              type: 'iframe',
              serverIndex: sources.length + 1
            });
          }
        });
      }
    });
  }

  /**
   * Exploration des liens internes pour trouver des sources cachées
   */
  private async exploreInternalLinks($: cheerio.CheerioAPI, baseUrl: string, language: 'VF' | 'VOSTFR', sources: CompleteVideoSource[]): Promise<void> {
    const internalLinks: string[] = [];
    
    $('a[href]').each((index, element) => {
      const href = $(element).attr('href');
      if (href && (href.includes('streaming') || href.includes('player') || href.includes('embed'))) {
        const fullUrl = href.startsWith('http') ? href : `${baseUrl}/${href}`;
        internalLinks.push(fullUrl);
      }
    });

    // Explorer quelques liens internes (limité pour éviter les boucles)
    for (const link of internalLinks.slice(0, 3)) {
      try {
        const linkResponse = await this.axiosInstance.get(link, {
          headers: { 'Referer': baseUrl },
          timeout: 5000
        });
        
        if (linkResponse.status === 200) {
          const linkContent = linkResponse.data;
          this.extractFromJavaScript(linkContent, language, sources);
          this.extractServerPatterns(linkContent, language, sources);
        }
      } catch (error) {
        continue;
      }
    }
  }

  /**
   * Parse un array JavaScript pour extraire les URLs
   */
  private parseJavaScriptArray(arrayContent: string): string[] {
    const urls: string[] = [];
    const urlMatches = arrayContent.match(/'([^']+)'/g);
    
    if (urlMatches) {
      urlMatches.forEach(match => {
        const url = match.replace(/'/g, '');
        if (url.length > 10) {
          urls.push(url);
        }
      });
    }
    
    return urls;
  }

  /**
   * Vérifie si une URL est une source vidéo valide
   */
  private isValidVideoSource(url: string): boolean {
    if (!url || url.length < 10) return false;
    
    const invalidPatterns = [
      /anime-sama\.fr\/streaming\//i,
      /javascript:/i,
      /mailto:/i,
      /\.css$/i,
      /\.js$/i,
      /\.png$/i,
      /\.jpg$/i
    ];
    
    if (invalidPatterns.some(pattern => pattern.test(url))) return false;
    
    const validPatterns = [
      /\.(mp4|m3u8|webm|avi|mkv)$/i,
      /sibnet\.ru/i,
      /vidmoly\.to/i,
      /sendvid\.com/i,
      /doodstream/i,
      /mixdrop/i,
      /uqload/i,
      /streamtape/i,
      /embed/i,
      /player/i
    ];
    
    return validPatterns.some(pattern => pattern.test(url));
  }

  /**
   * Normalise une URL
   */
  private normalizeUrl(url: string): string {
    if (url.startsWith('//')) return `https:${url}`;
    if (!url.startsWith('http')) return `https://${url}`;
    return url;
  }

  /**
   * Identifie le serveur depuis l'URL
   */
  private identifyServer(url: string, index: number): string {
    if (url.includes('sibnet')) return 'Sibnet';
    if (url.includes('vidmoly')) return 'Vidmoly';
    if (url.includes('sendvid')) return 'Sendvid';
    if (url.includes('doodstream')) return 'Doodstream';
    if (url.includes('mixdrop')) return 'Mixdrop';
    if (url.includes('uqload')) return 'Uqload';
    if (url.includes('streamtape')) return 'Streamtape';
    return `Serveur ${index}`;
  }

  /**
   * Détecte la qualité vidéo
   */
  private detectQuality(url: string): string {
    if (url.includes('1080') || url.includes('fhd')) return 'FHD';
    if (url.includes('720') || url.includes('hd')) return 'HD';
    if (url.includes('480') || url.includes('sd')) return 'SD';
    if (url.includes('360')) return '360p';
    
    if (url.includes('sibnet')) return 'SD';
    if (url.includes('vidmoly')) return 'HD';
    return 'HD';
  }

  /**
   * Détermine le type de source
   */
  private getSourceType(url: string): 'iframe' | 'direct' {
    if (url.match(/\.(mp4|m3u8|webm|avi|mkv)$/i)) return 'direct';
    return 'iframe';
  }

  /**
   * Supprime les doublons de sources
   */
  private deduplicateSources(sources: CompleteVideoSource[]): CompleteVideoSource[] {
    const seen = new Set<string>();
    return sources.filter(source => {
      if (seen.has(source.url)) return false;
      seen.add(source.url);
      return true;
    });
  }
}

export const completeVideoExtractor = new CompleteVideoExtractor();