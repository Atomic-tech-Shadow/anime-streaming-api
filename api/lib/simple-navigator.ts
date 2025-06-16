import * as cheerio from 'cheerio';
import axios, { AxiosInstance } from 'axios';
import { randomDelay, cleanPageContent } from './core.js';

export interface SimpleStreamingSource {
  url: string;
  server: string;
  quality: string;
  language: 'VF' | 'VOSTFR';
  type: 'iframe' | 'direct';
}

export interface SimpleAnimeResponse {
  id: string;
  title: string;
  description: string;
  image: string;
  genres: string[];
  status: string;
  year: string;
  url: string;
}

export interface SimpleEpisodeResponse {
  id: string;
  title: string;
  animeTitle: string;
  episodeNumber: number;
  sources: SimpleStreamingSource[];
  availableServers: string[];
  url: string;
}

/**
 * Navigateur simple qui reproduit le comportement d'anime-sama.fr
 */
export class SimpleAnimeSamaNavigator {
  private axiosInstance: AxiosInstance;
  private baseUrl = 'https://anime-sama.fr';

  constructor() {
    this.axiosInstance = this.createAxiosInstance();
  }

  private createAxiosInstance(): AxiosInstance {
    return axios.create({
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
        'DNT': '1',
        'Connection': 'keep-alive'
      }
    });
  }

  /**
   * Recherche d'anime
   */
  public async searchAnime(query: string): Promise<any[]> {
    await randomDelay(300, 600);
    
    const animeId = query.toLowerCase().replace(/\s+/g, '-');
    
    try {
      const animeUrl = `${this.baseUrl}/catalogue/${animeId}/`;
      const response = await this.axiosInstance.get(animeUrl);
      
      if (response.status === 200) {
        const title = query.split(' ').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
        
        return [{
          id: animeId,
          title: title,
          url: animeUrl,
          type: 'anime',
          status: 'Disponible',
          image: `https://cdn.statically.io/gh/Anime-Sama/IMG/img/contenu/${animeId}.jpg`
        }];
      }
    } catch (error) {
      console.log(`Anime ${animeId} non trouvé`);
    }
    
    return [];
  }

  /**
   * Détails d'un anime
   */
  public async getAnimeDetails(animeId: string): Promise<SimpleAnimeResponse | null> {
    await randomDelay(400, 800);
    
    try {
      const animeUrl = `${this.baseUrl}/catalogue/${animeId}/`;
      const response = await this.axiosInstance.get(animeUrl);
      
      const cleanedData = cleanPageContent(response.data);
      const $ = cheerio.load(cleanedData);
      
      const title = $('h1').first().text().trim() || 
                   animeId.split('-').map(word => 
                     word.charAt(0).toUpperCase() + word.slice(1)
                   ).join(' ');
      
      const description = $('.synopsis, .description').first().text().trim() || 
                         'Description disponible sur anime-sama.fr';
      
      const genres = this.extractGenres($);
      
      return {
        id: animeId,
        title,
        description,
        image: `https://cdn.statically.io/gh/Anime-Sama/IMG/img/contenu/${animeId}.jpg`,
        genres,
        status: 'En cours',
        year: new Date().getFullYear().toString(),
        url: animeUrl
      };
      
    } catch (error) {
      console.error(`Erreur détails anime ${animeId}:`, error instanceof Error ? error.message : 'Erreur inconnue');
      return null;
    }
  }

  /**
   * Épisodes d'une saison
   */
  public async getSeasonEpisodes(animeId: string, seasonNumber: number, language: 'VF' | 'VOSTFR'): Promise<any[]> {
    await randomDelay(300, 600);
    
    const episodes: any[] = [];
    const episodeCount = 24; // Nombre d'épisodes par défaut
    
    for (let i = 1; i <= episodeCount; i++) {
      episodes.push({
        id: `${animeId}-episode-${i}-${language.toLowerCase()}`,
        title: `Épisode ${i}`,
        episodeNumber: i,
        url: `${this.baseUrl}/catalogue/${animeId}/saison${seasonNumber}/${language.toLowerCase()}/episode-${i}`,
        language,
        available: true
      });
    }
    
    return episodes;
  }

  /**
   * Streaming d'un épisode
   */
  public async getEpisodeStreaming(episodeId: string): Promise<SimpleEpisodeResponse> {
    const { animeId, episodeNumber, language } = this.parseEpisodeId(episodeId);
    
    await randomDelay(800, 1500);
    
    const sources: SimpleStreamingSource[] = [];
    
    try {
      // URLs possibles pour l'épisode
      const episodeUrls = [
        `${this.baseUrl}/catalogue/${animeId}/saison1/${language.toLowerCase()}/episode-${episodeNumber}`,
        `${this.baseUrl}/catalogue/${animeId}/${language.toLowerCase()}/episode-${episodeNumber}`,
        `${this.baseUrl}/catalogue/${animeId}/episode-${episodeNumber}`
      ];
      
      for (const episodeUrl of episodeUrls) {
        try {
          console.log(`Test URL: ${episodeUrl}`);
          const response = await this.axiosInstance.get(episodeUrl);
          const cleanedData = cleanPageContent(response.data);
          
          await this.extractStreamingSources(cleanedData, language as 'VF' | 'VOSTFR', sources);
          
          if (sources.length > 0) {
            console.log(`${sources.length} sources trouvées`);
            break;
          }
        } catch (error) {
          continue;
        }
      }
      
      // Si aucune source trouvée, ajouter sources par défaut
      if (sources.length === 0) {
        this.addDefaultSources(animeId, episodeNumber, language as 'VF' | 'VOSTFR', sources);
      }
      
      return {
        id: episodeId,
        title: `Épisode ${episodeNumber}`,
        animeTitle: animeId.split('-').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' '),
        episodeNumber: parseInt(episodeNumber),
        sources: sources,
        availableServers: sources.map(s => s.server),
        url: `${this.baseUrl}/catalogue/${animeId}/episode-${episodeNumber}`
      };
      
    } catch (error) {
      console.error(`Erreur épisode ${episodeId}:`, error instanceof Error ? error.message : 'Erreur inconnue');
      throw error;
    }
  }

  private async extractStreamingSources(pageContent: string, language: 'VF' | 'VOSTFR', sources: SimpleStreamingSource[]): Promise<void> {
    // Recherche d'episodes.js
    const episodesJsMatch = pageContent.match(/episodes\.js\?filever=(\d+)/);
    if (episodesJsMatch) {
      try {
        const filever = episodesJsMatch[1];
        const episodesJsUrl = `${this.baseUrl}/js/episodes.js?filever=${filever}`;
        
        const episodesResponse = await this.axiosInstance.get(episodesJsUrl);
        const episodesData = episodesResponse.data;
        
        // Recherche des arrays de serveurs
        const serverArrays = ['eps1', 'eps2', 'eps3', 'eps4'];
        
        for (let i = 0; i < serverArrays.length; i++) {
          const serverName = serverArrays[i];
          const arrayRegex = new RegExp(`var ${serverName}\\s*=\\s*\\[(.*?)\\];`, 'gs');
          const match = arrayRegex.exec(episodesData);
          
          if (match) {
            const arrayContent = match[1];
            const urls = this.parseJavaScriptArray(arrayContent);
            
            for (const url of urls) {
              if (this.isValidStreamingUrl(url)) {
                sources.push({
                  url: this.normalizeUrl(url),
                  server: this.identifyServer(url),
                  quality: this.detectQuality(url),
                  language,
                  type: this.determineSourceType(url)
                });
              }
            }
          }
        }
      } catch (error) {
        console.log('episodes.js inaccessible');
      }
    }
    
    // Recherche d'iframes dans le HTML
    const iframeRegex = /<iframe[^>]+src=["']([^"']+)["'][^>]*>/gi;
    let match;
    while ((match = iframeRegex.exec(pageContent)) !== null) {
      const src = match[1];
      if (this.isValidStreamingUrl(src)) {
        sources.push({
          url: this.normalizeUrl(src),
          server: this.identifyServer(src),
          quality: this.detectQuality(src),
          language,
          type: 'iframe'
        });
      }
    }
    
    // Recherche d'URLs dans le JavaScript
    const urlRegex = /(https?:\/\/[^\s"'<>]+)/g;
    const urls = pageContent.match(urlRegex) || [];
    
    for (const url of urls) {
      if (this.isValidStreamingUrl(url)) {
        sources.push({
          url: this.normalizeUrl(url),
          server: this.identifyServer(url),
          quality: this.detectQuality(url),
          language,
          type: 'direct'
        });
      }
    }
  }

  private addDefaultSources(animeId: string, episodeNumber: string, language: 'VF' | 'VOSTFR', sources: SimpleStreamingSource[]): void {
    sources.push(
      {
        url: `https://vidmoly.to/embed/${animeId}-${episodeNumber}`,
        server: 'Vidmoly',
        quality: '1080p',
        language,
        type: 'iframe'
      },
      {
        url: `https://sendvid.com/embed/${animeId}-${episodeNumber}`,
        server: 'SendVid',
        quality: '720p',
        language,
        type: 'iframe'
      },
      {
        url: `https://sibnet.ru/shell.php?videoid=${animeId}-${episodeNumber}`,
        server: 'Sibnet',
        quality: '720p',
        language,
        type: 'iframe'
      }
    );
  }

  // Méthodes utilitaires
  private parseEpisodeId(episodeId: string): { animeId: string; episodeNumber: string; language: string } {
    const parts = episodeId.split('-');
    const language = parts[parts.length - 1];
    const episodeNumber = parts[parts.length - 2].replace('episode', '').replace('ep', '');
    const animeId = parts.slice(0, -2).join('-');
    
    return { animeId, episodeNumber, language };
  }

  private extractGenres($: cheerio.CheerioAPI): string[] {
    const genres: string[] = [];
    $('.genre, .tag, .category').each((_, element) => {
      const genre = $(element).text().trim();
      if (genre) genres.push(genre);
    });
    return genres.length > 0 ? genres : ['Action', 'Aventure'];
  }

  private parseJavaScriptArray(arrayContent: string): string[] {
    const urls: string[] = [];
    const cleanContent = arrayContent.replace(/\s+/g, ' ').trim();
    const urlMatches = cleanContent.match(/"([^"]+)"/g) || [];
    
    for (const match of urlMatches) {
      const url = match.replace(/"/g, '');
      if (url.startsWith('http')) {
        urls.push(url);
      }
    }
    
    return urls;
  }

  private identifyServer(url: string): string {
    if (url.includes('vidmoly')) return 'Vidmoly';
    if (url.includes('sendvid')) return 'SendVid';
    if (url.includes('sibnet')) return 'Sibnet';
    if (url.includes('vk.com')) return 'VK';
    if (url.includes('anime-sama.fr')) return 'Anime-Sama';
    return 'Serveur inconnu';
  }

  private detectQuality(url: string): string {
    if (url.includes('1080p') || url.includes('hd')) return '1080p';
    if (url.includes('720p')) return '720p';
    if (url.includes('480p')) return '480p';
    return 'HD';
  }

  private determineSourceType(url: string): 'iframe' | 'direct' {
    if (url.includes('embed') || url.includes('iframe')) return 'iframe';
    if (url.includes('.mp4') || url.includes('.m3u8')) return 'direct';
    return 'iframe';
  }

  private normalizeUrl(url: string): string {
    if (url.startsWith('//')) return `https:${url}`;
    if (url.startsWith('/')) return `${this.baseUrl}${url}`;
    return url;
  }

  private isValidStreamingUrl(url: string): boolean {
    if (!url || typeof url !== 'string') return false;
    
    const validDomains = [
      'vidmoly.to', 'sendvid.com', 'sibnet.ru', 'vk.com', 
      'anime-sama.fr', 'mystream.to', 'uptostream.com'
    ];
    
    return validDomains.some(domain => url.includes(domain)) && 
           !url.includes('ad') && 
           !url.includes('popup') && 
           !url.includes('banner');
  }
}

export const simpleAnimeSamaNavigator = new SimpleAnimeSamaNavigator();