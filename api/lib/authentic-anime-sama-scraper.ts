import axios, { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';
import { createAxiosInstance } from './core';

export interface AuthenticVideoSource {
  url: string;
  server: string;
  quality: string;
  language: 'VF' | 'VOSTFR';
  type: 'iframe' | 'direct';
  serverIndex: number;
}

/**
 * Scraper authentique qui extrait UNIQUEMENT les vraies sources vidéo d'anime-sama.fr
 * Aucune donnée synthétique - seulement l'extraction directe depuis le site source
 */
export class AuthenticAnimeSamaScraper {
  private axiosInstance: AxiosInstance;
  private baseUrl = 'https://anime-sama.fr';

  constructor() {
    this.axiosInstance = createAxiosInstance();
  }

  /**
   * Extraction authentique des sources vidéo pour films et séries
   */
  public async extractAuthenticSources(pageUrl: string, language: 'VF' | 'VOSTFR'): Promise<AuthenticVideoSource[]> {
    const sources: AuthenticVideoSource[] = [];
    
    try {
      console.log(`Extraction authentique depuis: ${pageUrl}`);
      
      // Visiter la page principale
      const response = await this.axiosInstance.get(pageUrl, {
        headers: {
          'Referer': this.baseUrl,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
          'Cache-Control': 'no-cache'
        }
      });

      if (response.status !== 200) {
        return sources;
      }

      const pageContent = response.data;
      const $ = cheerio.load(pageContent);
      
      // Méthode 1: Recherche des fichiers episodes.js (pour séries)
      await this.extractFromEpisodesJs(pageContent, pageUrl, language, sources);
      
      // Méthode 2: Recherche des iframes directes (pour films)
      this.extractDirectEmbeds($, language, sources);
      
      // Méthode 3: Recherche dans les scripts JavaScript intégrés
      this.extractFromPageScripts(pageContent, language, sources);
      
      // Méthode 4: Recherche des boutons/liens de serveurs
      this.extractFromServerButtons($, pageUrl, language, sources);
      
      // Méthode 5: Exploration des liens de streaming
      await this.exploreStreamingLinks($, pageUrl, language, sources);
      
      console.log(`Sources authentiques extraites: ${sources.length}`);
      return this.removeDuplicates(sources);

    } catch (error: any) {
      console.error('Erreur extraction authentique:', error.message);
      return sources;
    }
  }

  /**
   * Extraction depuis les fichiers episodes.js
   */
  private async extractFromEpisodesJs(pageContent: string, baseUrl: string, language: 'VF' | 'VOSTFR', sources: AuthenticVideoSource[]): Promise<void> {
    const episodesJsMatches = pageContent.match(/episodes\.js\?filever=(\d+)/g);
    
    if (episodesJsMatches) {
      for (const match of episodesJsMatches) {
        try {
          const episodesJsUrl = `${baseUrl}/${match}`;
          const episodesResponse = await this.axiosInstance.get(episodesJsUrl, {
            headers: { 'Referer': baseUrl }
          });

          if (episodesResponse.data) {
            this.parseEpisodesContent(episodesResponse.data, language, sources);
          }
        } catch (error) {
          continue;
        }
      }
    }
  }

  /**
   * Parse le contenu du fichier episodes.js
   */
  private parseEpisodesContent(content: string, language: 'VF' | 'VOSTFR', sources: AuthenticVideoSource[]): void {
    const serverVariables = ['eps1', 'eps2', 'eps3', 'eps4', 'epsAS'];
    
    serverVariables.forEach((varName, index) => {
      const regex = new RegExp(`var ${varName}\\s*=\\s*\\[(.*?)\\];`, 'gs');
      const match = regex.exec(content);
      
      if (match) {
        const arrayContent = match[1];
        const urls = this.extractUrlsFromArray(arrayContent);
        
        urls.forEach(url => {
          if (this.isValidVideoUrl(url)) {
            sources.push({
              url: this.normalizeUrl(url),
              server: this.identifyServerFromUrl(url),
              quality: this.detectVideoQuality(url),
              language,
              type: this.getUrlType(url),
              serverIndex: index + 1
            });
          }
        });
      }
    });
  }

  /**
   * Extraction des iframes directes
   */
  private extractDirectEmbeds($: cheerio.CheerioAPI, language: 'VF' | 'VOSTFR', sources: AuthenticVideoSource[]): void {
    $('iframe[src]').each((index, element) => {
      const src = $(element).attr('src');
      if (src && this.isValidVideoUrl(src)) {
        sources.push({
          url: this.normalizeUrl(src),
          server: this.identifyServerFromUrl(src),
          quality: this.detectVideoQuality(src),
          language,
          type: 'iframe',
          serverIndex: index + 1
        });
      }
    });
  }

  /**
   * Extraction depuis les scripts de la page
   */
  private extractFromPageScripts(pageContent: string, language: 'VF' | 'VOSTFR', sources: AuthenticVideoSource[]): void {
    const patterns = [
      // URLs de serveurs de streaming populaires
      /(https?:\/\/video\.sibnet\.ru\/shell\.php\?videoid=\d+)/gi,
      /(https?:\/\/vidmoly\.to\/embed-[a-z0-9]+\.html)/gi,
      /(https?:\/\/sendvid\.com\/embed\/[a-z0-9]+)/gi,
      /(https?:\/\/doodstream\.com\/e\/[a-z0-9]+)/gi,
      /(https?:\/\/mixdrop\.co\/e\/[a-z0-9]+)/gi,
      // URLs de vidéos directes
      /(https?:\/\/[^\s"']+\.(?:mp4|m3u8|webm))/gi
    ];

    patterns.forEach(pattern => {
      const matches = pageContent.match(pattern);
      if (matches) {
        matches.forEach(match => {
          if (this.isValidVideoUrl(match) && !sources.some(s => s.url === match)) {
            sources.push({
              url: match,
              server: this.identifyServerFromUrl(match),
              quality: this.detectVideoQuality(match),
              language,
              type: this.getUrlType(match),
              serverIndex: sources.length + 1
            });
          }
        });
      }
    });
  }

  /**
   * Extraction depuis les boutons de serveur
   */
  private extractFromServerButtons($: cheerio.CheerioAPI, baseUrl: string, language: 'VF' | 'VOSTFR', sources: AuthenticVideoSource[]): void {
    $('button[onclick], a[onclick]').each((index, element) => {
      const onclick = $(element).attr('onclick');
      if (onclick) {
        const urlMatch = onclick.match(/(https?:\/\/[^"']+)/);
        if (urlMatch && this.isValidVideoUrl(urlMatch[1])) {
          sources.push({
            url: this.normalizeUrl(urlMatch[1]),
            server: this.identifyServerFromUrl(urlMatch[1]),
            quality: this.detectVideoQuality(urlMatch[1]),
            language,
            type: this.getUrlType(urlMatch[1]),
            serverIndex: index + 1
          });
        }
      }
    });
  }

  /**
   * Exploration des liens de streaming
   */
  private async exploreStreamingLinks($: cheerio.CheerioAPI, baseUrl: string, language: 'VF' | 'VOSTFR', sources: AuthenticVideoSource[]): Promise<void> {
    const streamingLinks: string[] = [];
    
    $('a[href]').each((index, element) => {
      const href = $(element).attr('href');
      if (href && (href.includes('streaming') || href.includes('player'))) {
        const fullUrl = href.startsWith('http') ? href : `${baseUrl}/${href}`;
        streamingLinks.push(fullUrl);
      }
    });

    // Explorer les liens de streaming (limité à 2 pour éviter les boucles)
    for (const link of streamingLinks.slice(0, 2)) {
      try {
        const linkResponse = await this.axiosInstance.get(link, {
          headers: { 'Referer': baseUrl },
          timeout: 10000
        });
        
        if (linkResponse.status === 200) {
          const linkContent = linkResponse.data;
          this.extractFromPageScripts(linkContent, language, sources);
          
          const linkCheerio = cheerio.load(linkContent);
          this.extractDirectEmbeds(linkCheerio, language, sources);
        }
      } catch (error) {
        continue;
      }
    }
  }

  /**
   * Extrait les URLs depuis un array JavaScript
   */
  private extractUrlsFromArray(arrayContent: string): string[] {
    const urls: string[] = [];
    const matches = arrayContent.match(/'([^']+)'/g);
    
    if (matches) {
      matches.forEach(match => {
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
  private isValidVideoUrl(url: string): boolean {
    if (!url || url.length < 10) return false;
    
    // URLs invalides à exclure
    const invalidPatterns = [
      /anime-sama\.fr\/streaming\//i,
      /javascript:/i,
      /mailto:/i,
      /\.(css|js|png|jpg|gif)$/i
    ];
    
    if (invalidPatterns.some(pattern => pattern.test(url))) return false;
    
    // URLs valides de serveurs de streaming
    const validPatterns = [
      /sibnet\.ru/i,
      /vidmoly\.to/i,
      /sendvid\.com/i,
      /doodstream/i,
      /mixdrop/i,
      /uqload/i,
      /streamtape/i,
      /\.(mp4|m3u8|webm)$/i
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
  private identifyServerFromUrl(url: string): string {
    if (url.includes('sibnet')) return 'Sibnet';
    if (url.includes('vidmoly')) return 'Vidmoly';
    if (url.includes('sendvid')) return 'Sendvid';
    if (url.includes('doodstream')) return 'Doodstream';
    if (url.includes('mixdrop')) return 'Mixdrop';
    if (url.includes('uqload')) return 'Uqload';
    if (url.includes('streamtape')) return 'Streamtape';
    return 'Serveur Direct';
  }

  /**
   * Détecte la qualité vidéo
   */
  private detectVideoQuality(url: string): string {
    if (url.includes('1080') || url.includes('fhd')) return 'FHD';
    if (url.includes('720') || url.includes('hd')) return 'HD';
    if (url.includes('480') || url.includes('sd')) return 'SD';
    return 'HD';
  }

  /**
   * Détermine le type d'URL
   */
  private getUrlType(url: string): 'iframe' | 'direct' {
    if (url.match(/\.(mp4|m3u8|webm)$/i)) return 'direct';
    return 'iframe';
  }

  /**
   * Supprime les doublons
   */
  private removeDuplicates(sources: AuthenticVideoSource[]): AuthenticVideoSource[] {
    const seen = new Set<string>();
    return sources.filter(source => {
      if (seen.has(source.url)) return false;
      seen.add(source.url);
      return true;
    });
  }
}

export const authenticAnimeSamaScraper = new AuthenticAnimeSamaScraper();