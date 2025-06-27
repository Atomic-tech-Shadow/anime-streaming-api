import axios, { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';
import { createAxiosInstance } from './core';

export interface ExtractedVideoSource {
  url: string;
  server: string;
  quality: string;
  language: 'VF' | 'VOSTFR';
  type: 'iframe' | 'direct';
  serverIndex: number;
}

/**
 * Extracteur spécialisé pour obtenir les vraies URLs vidéo lisibles par un lecteur
 */
export class VideoSourceExtractor {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = createAxiosInstance();
  }

  /**
   * Extrait les vraies sources vidéo depuis une URL de streaming anime-sama.fr
   */
  public async extractRealVideoSources(streamingUrl: string, language: 'VF' | 'VOSTFR'): Promise<ExtractedVideoSource[]> {
    const sources: ExtractedVideoSource[] = [];
    
    try {
      console.log(`Extraction sources vidéo depuis: ${streamingUrl}`);
      
      const response = await this.axiosInstance.get(streamingUrl, {
        headers: {
          'Referer': 'https://anime-sama.fr/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      if (response.status === 404) {
        console.log('Page streaming introuvable (404)');
        return sources;
      }

      const pageContent = response.data;
      const $ = cheerio.load(pageContent);
      
      // 1. Extraction des iframes de streaming
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

      // 2. Extraction des URLs vidéo directes depuis les scripts
      const scriptContent = $('script').text();
      
      // Patterns pour les URLs vidéo directes
      const videoPatterns = [
        /(https?:\/\/[^\s"']+\.(?:mp4|m3u8|webm|avi|mkv))/gi,
        /(https?:\/\/video\.sibnet\.ru\/shell\.php\?videoid=\d+)/gi,
        /(https?:\/\/vidmoly\.to\/embed-[a-zA-Z0-9]+\.html)/gi,
        /(https?:\/\/sendvid\.com\/embed\/[a-zA-Z0-9]+)/gi,
        /(https?:\/\/doodstream\.com\/[a-zA-Z0-9]+)/gi,
        /(https?:\/\/mixdrop\.co\/[a-zA-Z0-9]+)/gi
      ];

      videoPatterns.forEach(pattern => {
        const matches = scriptContent.match(pattern);
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

      // 3. Extraction depuis les variables JavaScript
      const jsVariableMatches = scriptContent.match(/(?:var\s+\w+\s*=\s*["']([^"']+)["'])/gi);
      if (jsVariableMatches) {
        jsVariableMatches.forEach((match: string) => {
          const urlMatch = match.match(/["']([^"']+)["']/);
          if (urlMatch && urlMatch[1] && this.isValidVideoSource(urlMatch[1])) {
            const url = urlMatch[1];
            if (!sources.some(s => s.url === url)) {
              sources.push({
                url: this.normalizeUrl(url),
                server: this.identifyServer(url, sources.length + 1),
                quality: this.detectQuality(url),
                language,
                type: this.getSourceType(url),
                serverIndex: sources.length + 1
              });
            }
          }
        });
      }

      console.log(`Sources vidéo extraites: ${sources.length}`);
      return sources;

    } catch (error: any) {
      console.error('Erreur extraction sources vidéo:', error.message);
      return sources;
    }
  }

  /**
   * Vérifie si une URL est une source vidéo valide et lisible
   */
  private isValidVideoSource(url: string): boolean {
    if (!url || url.length < 10) return false;
    
    // Exclure les URLs de pages anime-sama.fr
    if (url.includes('anime-sama.fr/streaming/')) return false;
    
    const validPatterns = [
      // Fichiers vidéo directs
      /\.(mp4|m3u8|webm|avi|mkv|flv)$/i,
      // Serveurs de streaming populaires
      /sibnet\.ru/i,
      /vidmoly\.to/i,
      /sendvid\.com/i,
      /doodstream\.com/i,
      /mixdrop\.co/i,
      /uqload\.com/i,
      /streamtape\.com/i,
      /streamlare\.com/i,
      // Embed patterns
      /\/embed\//i,
      /\/player\//i,
      /\/watch\//i
    ];

    return validPatterns.some(pattern => pattern.test(url));
  }

  /**
   * Normalise une URL
   */
  private normalizeUrl(url: string): string {
    if (url.startsWith('//')) {
      return `https:${url}`;
    }
    if (!url.startsWith('http')) {
      return `https://${url}`;
    }
    return url;
  }

  /**
   * Identifie le serveur basé sur l'URL
   */
  private identifyServer(url: string, index: number): string {
    if (url.includes('sibnet')) return 'Sibnet';
    if (url.includes('vidmoly')) return 'Vidmoly';
    if (url.includes('sendvid')) return 'Sendvid';
    if (url.includes('doodstream')) return 'Doodstream';
    if (url.includes('mixdrop')) return 'Mixdrop';
    if (url.includes('uqload')) return 'Uqload';
    if (url.includes('streamtape')) return 'Streamtape';
    if (url.includes('streamlare')) return 'Streamlare';
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
    
    // Qualité par serveur
    if (url.includes('sibnet')) return 'SD';
    if (url.includes('vidmoly')) return 'HD';
    if (url.includes('sendvid')) return 'HD';
    
    return 'HD';
  }

  /**
   * Détermine le type de source
   */
  private getSourceType(url: string): 'iframe' | 'direct' {
    if (url.match(/\.(mp4|m3u8|webm|avi|mkv)$/i)) {
      return 'direct';
    }
    return 'iframe';
  }
}

export const videoSourceExtractor = new VideoSourceExtractor();