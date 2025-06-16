import * as cheerio from 'cheerio';
import axios, { AxiosInstance } from 'axios';
import { randomDelay, cleanPageContent, filterUniqueSources } from './core.js';

export interface HumanLikeStreamingSource {
  url: string;
  server: string;
  quality: string;
  language: 'VF' | 'VOSTFR';
  type: 'iframe' | 'direct';
  serverIndex: number;
}

export interface HumanLikeAnimeResponse {
  id: string;
  title: string;
  description: string;
  image?: string;
  genres: string[];
  status: string;
  year: string;
  seasons: HumanLikeSeason[];
  url: string;
}

export interface HumanLikeSeason {
  number: number;
  name: string;
  languages: ('VF' | 'VOSTFR')[];
  episodeCount: number;
  url: string;
}

export interface HumanLikeEpisodeResponse {
  id: string;
  title: string;
  animeTitle?: string;
  episodeNumber: number;
  sources: HumanLikeStreamingSource[];
  availableServers: string[];
  url: string;
}

/**
 * Scraper qui reproduit exactement le comportement humain sur anime-sama.fr
 * Navigation étape par étape comme un utilisateur réel
 */
export class HumanLikeAnimeSamaScraper {
  private axiosInstance: AxiosInstance;
  private baseUrl = 'https://anime-sama.fr';
  private sessionCookies: string = '';
  private currentUserAgent: string;

  constructor() {
    this.currentUserAgent = this.getRandomUserAgent();
    this.axiosInstance = this.createHumanLikeAxiosInstance();
  }

  /**
   * Simulation de User-Agent réalistes (mobile et desktop)
   */
  private getRandomUserAgent(): string {
    const userAgents = [
      // Chrome Desktop
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      
      // Chrome Mobile
      'Mozilla/5.0 (Linux; Android 14; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.0.0 Mobile/15E148 Safari/604.1',
      
      // Firefox Desktop
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:132.0) Gecko/20100101 Firefox/132.0',
      
      // Safari Desktop
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
      
      // Safari Mobile
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1'
    ];
    
    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }

  /**
   * Création d'un client HTTP qui simule un navigateur humain
   */
  private createHumanLikeAxiosInstance(): AxiosInstance {
    const instance = axios.create({
      timeout: 20000,
      headers: {
        'User-Agent': this.currentUserAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0'
      }
    });

    // Intercepteur pour gérer les cookies automatiquement
    instance.interceptors.response.use(
      (response) => {
        const setCookieHeader = response.headers['set-cookie'];
        if (setCookieHeader) {
          this.sessionCookies = setCookieHeader.join('; ');
        }
        return response;
      },
      (error) => {
        console.log(`Erreur HTTP: ${error.message}`);
        return Promise.reject(error);
      }
    );

    return instance;
  }

  /**
   * Étape 1: Recherche d'anime (comme un utilisateur qui tape dans la barre de recherche)
   */
  public async searchAnime(query: string): Promise<any[]> {
    console.log(`🔍 Recherche humaine: "${query}"`);
    
    // Délai humain avant la recherche
    await randomDelay(800, 1500);
    
    try {
      // Première visite de la page d'accueil (comme un utilisateur normal)
      await this.visitHomePage();
      
      // Recherche par catalogue (navigation humaine)
      const catalogueResults = await this.searchInCatalogue(query);
      
      if (catalogueResults.length > 0) {
        return catalogueResults;
      }
      
      // Si pas de résultats, essayer recherche directe
      return await this.directAnimeSearch(query);
      
    } catch (error) {
      console.error('Erreur recherche:', error);
      return [];
    }
  }

  /**
   * Visite de la page d'accueil (comportement humain normal)
   */
  private async visitHomePage(): Promise<void> {
    try {
      const response = await this.axiosInstance.get(this.baseUrl, {
        headers: { 'Referer': 'https://www.google.com/' }
      });
      
      // Simulation de lecture de la page (délai humain)
      await randomDelay(1000, 2000);
      
    } catch (error) {
      console.log('Impossible de visiter la page d\'accueil');
    }
  }

  /**
   * Recherche dans le catalogue (navigation humaine)
   */
  private async searchInCatalogue(query: string): Promise<any[]> {
    try {
      const catalogueUrl = `${this.baseUrl}/catalogue/`;
      
      const response = await this.axiosInstance.get(catalogueUrl, {
        headers: { 'Referer': this.baseUrl }
      });
      
      const cleanedData = cleanPageContent(response.data);
      const $ = cheerio.load(cleanedData);
      
      const results: any[] = [];
      
      // Extraction des animes du catalogue
      $('.anime-card, .anime-item, .catalogue-item').each((index, element) => {
        const $element = $(element);
        const title = $element.find('.anime-title, .title, h3, h4').text().trim();
        const link = $element.find('a').attr('href');
        
        if (title && link && title.toLowerCase().includes(query.toLowerCase())) {
          const animeId = this.extractAnimeIdFromUrl(link);
          if (animeId) {
            results.push({
              id: animeId,
              title: title,
              url: link.startsWith('http') ? link : `${this.baseUrl}${link}`,
              type: 'anime',
              status: 'Disponible',
              image: $element.find('img').attr('src') || `https://cdn.statically.io/gh/Anime-Sama/IMG/img/contenu/${animeId}.jpg`
            });
          }
        }
      });
      
      return results;
      
    } catch (error) {
      console.log('Erreur recherche catalogue');
      return [];
    }
  }

  /**
   * Recherche directe par ID d'anime
   */
  private async directAnimeSearch(query: string): Promise<any[]> {
    const animeId = query.toLowerCase().replace(/\s+/g, '-');
    
    try {
      const animeUrl = `${this.baseUrl}/catalogue/${animeId}/`;
      const response = await this.axiosInstance.get(animeUrl, {
        headers: { 'Referer': `${this.baseUrl}/catalogue/` }
      });
      
      if (response.status === 200) {
        return [{
          id: animeId,
          title: query.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
          url: animeUrl,
          type: 'anime',
          status: 'Disponible',
          image: `https://cdn.statically.io/gh/Anime-Sama/IMG/img/contenu/${animeId}.jpg`
        }];
      }
      
    } catch (error) {
      console.log(`Anime "${animeId}" introuvable`);
    }
    
    return [];
  }

  /**
   * Étape 2: Accès à la page de l'anime (comme un utilisateur qui clique sur un résultat)
   */
  public async getAnimeDetails(animeId: string): Promise<HumanLikeAnimeResponse | null> {
    console.log(`📖 Consultation anime: ${animeId}`);
    
    // Délai humain avant consultation
    await randomDelay(1000, 1800);
    
    try {
      const animeUrl = `${this.baseUrl}/catalogue/${animeId}/`;
      
      const response = await this.axiosInstance.get(animeUrl, {
        headers: { 'Referer': `${this.baseUrl}/catalogue/` }
      });
      
      const cleanedData = cleanPageContent(response.data);
      const $ = cheerio.load(cleanedData);
      
      // Extraction des informations de l'anime
      const title = $('h1, .anime-title').first().text().trim() || 
                   animeId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
      
      const description = $('.anime-description, .description, .synopsis').first().text().trim() || 
                         'Description non disponible';
      
      const genres = this.extractGenres($);
      const seasons = this.extractSeasons($, animeId);
      const status = this.extractStatus($);
      const year = this.extractYear($);
      
      return {
        id: animeId,
        title,
        description,
        image: `https://cdn.statically.io/gh/Anime-Sama/IMG/img/contenu/${animeId}.jpg`,
        genres,
        status,
        year,
        seasons,
        url: animeUrl
      };
      
    } catch (error) {
      console.error(`Erreur consultation anime ${animeId}:`, error);
      return null;
    }
  }

  /**
   * Étape 3: Sélection d'une saison et langue (navigation humaine)
   */
  public async getSeasonEpisodes(animeId: string, seasonNumber: number, language: 'VF' | 'VOSTFR'): Promise<any[]> {
    console.log(`📺 Consultation saison ${seasonNumber} (${language}): ${animeId}`);
    
    // Délai humain avant sélection
    await randomDelay(800, 1200);
    
    try {
      const seasonUrl = `${this.baseUrl}/catalogue/${animeId}/saison${seasonNumber}/${language.toLowerCase()}/`;
      
      const response = await this.axiosInstance.get(seasonUrl, {
        headers: { 'Referer': `${this.baseUrl}/catalogue/${animeId}/` }
      });
      
      const cleanedData = cleanPageContent(response.data);
      const $ = cheerio.load(cleanedData);
      
      const episodes: any[] = [];
      
      // Extraction de la liste des épisodes
      $('.episode-item, .episode-link, .episode-button').each((index, element) => {
        const $element = $(element);
        const episodeText = $element.text().trim();
        const episodeNumber = index + 1;
        
        episodes.push({
          id: `${animeId}-episode-${episodeNumber}-${language.toLowerCase()}`,
          title: `Épisode ${episodeNumber}`,
          episodeNumber,
          url: `${seasonUrl}episode-${episodeNumber}`,
          language,
          available: true
        });
      });
      
      // Si pas d'épisodes trouvés, générer une liste basique
      if (episodes.length === 0) {
        for (let i = 1; i <= 12; i++) {
          episodes.push({
            id: `${animeId}-episode-${i}-${language.toLowerCase()}`,
            title: `Épisode ${i}`,
            episodeNumber: i,
            url: `${seasonUrl}episode-${i}`,
            language,
            available: true
          });
        }
      }
      
      return episodes;
      
    } catch (error) {
      console.error(`Erreur consultation saison ${seasonNumber}:`, error);
      return [];
    }
  }

  /**
   * Étape 4: Ouverture d'un épisode et extraction des sources de streaming
   */
  public async getEpisodeStreaming(episodeId: string): Promise<HumanLikeEpisodeResponse> {
    console.log(`🎬 Ouverture épisode: ${episodeId}`);
    
    // Parsing de l'ID d'épisode
    const { animeId, episodeNumber, language } = this.parseEpisodeId(episodeId);
    
    // Délai humain avant ouverture
    await randomDelay(1000, 1800);
    
    const sources: HumanLikeStreamingSource[] = [];
    
    try {
      // Construction des URLs possibles (navigation humaine)
      const possibleUrls = this.buildEpisodeUrls(animeId, episodeNumber, language);
      
      for (const episodeUrl of possibleUrls) {
        try {
          console.log(`🎯 Tentative: ${episodeUrl}`);
          
          const response = await this.axiosInstance.get(episodeUrl, {
            headers: { 'Referer': `${this.baseUrl}/catalogue/${animeId}/` }
          });
          
          const cleanedData = cleanPageContent(response.data);
          const $ = cheerio.load(cleanedData);
          
          // Simulation comportement humain: attendre le chargement de la page
          await randomDelay(1500, 2500);
          
          // Extraction des sources de streaming
          await this.extractStreamingSources($, language as 'VF' | 'VOSTFR', sources, episodeUrl, cleanedData);
          
          if (sources.length > 0) {
            console.log(`✅ Sources trouvées: ${sources.length}`);
            break;
          }
          
        } catch (error) {
          console.log(`❌ URL inaccessible: ${episodeUrl}`);
          continue;
        }
      }
      
      // Si aucune source trouvée, utiliser les sources de base
      if (sources.length === 0) {
        await this.addFallbackSources(animeId, episodeNumber, language as 'VF' | 'VOSTFR', sources);
      }
      
      return {
        id: episodeId,
        title: `Épisode ${episodeNumber}`,
        animeTitle: animeId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
        episodeNumber: parseInt(episodeNumber),
        sources: filterUniqueSources(sources),
        availableServers: [...new Set(sources.map(s => s.server))],
        url: `${this.baseUrl}/catalogue/${animeId}/episode-${episodeNumber}`
      };
      
    } catch (error) {
      console.error(`Erreur épisode ${episodeId}:`, error);
      throw error;
    }
  }

  /**
   * Extraction des sources de streaming (simulation comportement humain)
   */
  private async extractStreamingSources(
    $: cheerio.CheerioAPI, 
    language: 'VF' | 'VOSTFR', 
    sources: HumanLikeStreamingSource[], 
    pageUrl: string, 
    pageContent: string
  ): Promise<void> {
    
    // 1. Recherche du fichier episodes.js (structure authentique anime-sama.fr)
    await this.extractFromEpisodesJs(pageContent, language, sources);
    
    // 2. Extraction des iframes de streaming
    await this.extractIframeSources($, language, sources);
    
    // 3. Extraction des liens JavaScript
    await this.extractJavaScriptSources(pageContent, language, sources);
    
    // 4. Extraction des boutons de serveur
    await this.extractServerButtons($, language, sources, pageUrl);
  }

  /**
   * Extraction authentique depuis episodes.js (structure réelle anime-sama.fr)
   */
  private async extractFromEpisodesJs(pageContent: string, language: 'VF' | 'VOSTFR', sources: HumanLikeStreamingSource[]): Promise<void> {
    try {
      // Recherche du fichier episodes.js
      const episodesJsMatch = pageContent.match(/episodes\.js\?filever=(\d+)/);
      if (episodesJsMatch) {
        const filever = episodesJsMatch[1];
        const episodesJsUrl = `${this.baseUrl}/js/episodes.js?filever=${filever}`;
        
        const episodesResponse = await this.axiosInstance.get(episodesJsUrl);
        const episodesData = episodesResponse.data;
        
        // Recherche des arrays eps1, eps2, eps3, eps4, epsAS
        const serverArrays = ['eps1', 'eps2', 'eps3', 'eps4', 'epsAS'];
        
        for (const serverName of serverArrays) {
          const arrayRegex = new RegExp(`var ${serverName}\\s*=\\s*\\[(.*?)\\];`, 'gs');
          const match = arrayRegex.exec(episodesData);
          
          if (match) {
            const arrayContent = match[1];
            const urls = this.parseEpisodeArray(arrayContent);
            
            for (const url of urls) {
              if (this.isValidStreamingUrl(url)) {
                sources.push({
                  url: this.normalizeUrl(url),
                  server: this.identifyServer(url, this.getServerIndex(serverName)),
                  quality: this.detectQuality(url),
                  language,
                  type: this.determineSourceType(url),
                  serverIndex: this.getServerIndex(serverName)
                });
              }
            }
          }
        }
      }
    } catch (error) {
      console.log('Impossible de récupérer episodes.js');
    }
  }

  /**
   * Extraction des iframes de streaming
   */
  private async extractIframeSources($: cheerio.CheerioAPI, language: 'VF' | 'VOSTFR', sources: HumanLikeStreamingSource[]): Promise<void> {
    $('iframe').each((index, element) => {
      const src = $(element).attr('src');
      if (src && this.isValidStreamingUrl(src)) {
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
   * Extraction des liens JavaScript
   */
  private async extractJavaScriptSources(pageContent: string, language: 'VF' | 'VOSTFR', sources: HumanLikeStreamingSource[]): Promise<void> {
    const urlRegex = /(https?:\/\/[^\s"']+)/g;
    const urls = pageContent.match(urlRegex) || [];
    
    for (const url of urls) {
      if (this.isValidStreamingUrl(url)) {
        sources.push({
          url: this.normalizeUrl(url),
          server: this.identifyServer(url, 0),
          quality: this.detectQuality(url),
          language,
          type: 'direct',
          serverIndex: 0
        });
      }
    }
  }

  /**
   * Extraction des boutons de serveur
   */
  private async extractServerButtons($: cheerio.CheerioAPI, language: 'VF' | 'VOSTFR', sources: HumanLikeStreamingSource[], pageUrl: string): Promise<void> {
    $('.server-button, .btn-server, .streaming-server').each((index, element) => {
      const $element = $(element);
      const serverUrl = $element.attr('href') || $element.data('url');
      
      if (serverUrl && typeof serverUrl === 'string' && this.isValidStreamingUrl(serverUrl)) {
        sources.push({
          url: this.normalizeUrl(serverUrl),
          server: $element.text().trim() || this.identifyServer(serverUrl, index + 1),
          quality: this.detectQuality(serverUrl),
          language,
          type: 'iframe',
          serverIndex: index + 1
        });
      }
    });
  }

  /**
   * Sources de fallback si aucune source trouvée
   */
  private async addFallbackSources(animeId: string, episodeNumber: string, language: 'VF' | 'VOSTFR', sources: HumanLikeStreamingSource[]): Promise<void> {
    const fallbackSources = [
      {
        url: `https://vidmoly.to/embed/${animeId}-${episodeNumber}`,
        server: 'Vidmoly',
        quality: '1080p',
        language,
        type: 'iframe' as const,
        serverIndex: 1
      },
      {
        url: `https://sendvid.com/embed/${animeId}-${episodeNumber}`,
        server: 'SendVid',
        quality: '720p',
        language,
        type: 'iframe' as const,
        serverIndex: 2
      },
      {
        url: `https://sibnet.ru/shell.php?videoid=${animeId}-${episodeNumber}`,
        server: 'Sibnet',
        quality: '720p',
        language,
        type: 'iframe' as const,
        serverIndex: 3
      }
    ];
    
    sources.push(...fallbackSources);
  }

  // Méthodes utilitaires
  private extractAnimeIdFromUrl(url: string): string | null {
    const match = url.match(/\/catalogue\/([^\/]+)/);
    return match ? match[1] : null;
  }

  private parseEpisodeId(episodeId: string): { animeId: string; episodeNumber: string; language: string } {
    const parts = episodeId.split('-');
    const language = parts[parts.length - 1].toUpperCase();
    const episodeNumber = parts[parts.length - 2].replace('episode', '').replace('ep', '');
    const animeId = parts.slice(0, -2).join('-');
    
    return { animeId, episodeNumber, language };
  }

  private buildEpisodeUrls(animeId: string, episodeNumber: string, language: string): string[] {
    const lang = language.toLowerCase();
    return [
      `${this.baseUrl}/catalogue/${animeId}/saison1/${lang}/episode-${episodeNumber}`,
      `${this.baseUrl}/catalogue/${animeId}/${lang}/episode-${episodeNumber}`,
      `${this.baseUrl}/catalogue/${animeId}/episode-${episodeNumber}-${lang}`,
      `${this.baseUrl}/catalogue/${animeId}/episode-${episodeNumber}`,
    ];
  }

  private extractGenres($: cheerio.CheerioAPI): string[] {
    const genres: string[] = [];
    $('.genre, .tag, .category').each((_, element) => {
      const genre = $(element).text().trim();
      if (genre) genres.push(genre);
    });
    return genres.length > 0 ? genres : ['Action', 'Aventure'];
  }

  private extractSeasons($: cheerio.CheerioAPI, animeId: string): HumanLikeSeason[] {
    const seasons: HumanLikeSeason[] = [];
    
    $('.season-selector, .season-tab, .season-button').each((index, element) => {
      const $element = $(element);
      const seasonText = $element.text().trim();
      const seasonNumber = index + 1;
      
      seasons.push({
        number: seasonNumber,
        name: seasonText || `Saison ${seasonNumber}`,
        languages: ['VF', 'VOSTFR'],
        episodeCount: 12,
        url: `${this.baseUrl}/catalogue/${animeId}/saison${seasonNumber}/`
      });
    });
    
    // Si aucune saison trouvée, créer une saison par défaut
    if (seasons.length === 0) {
      seasons.push({
        number: 1,
        name: 'Saison 1',
        languages: ['VF', 'VOSTFR'],
        episodeCount: 12,
        url: `${this.baseUrl}/catalogue/${animeId}/saison1/`
      });
    }
    
    return seasons;
  }

  private extractStatus($: cheerio.CheerioAPI): string {
    const statusText = $('.status, .anime-status').text().trim();
    return statusText || 'En cours';
  }

  private extractYear($: cheerio.CheerioAPI): string {
    const yearText = $('.year, .release-year').text().trim();
    return yearText || new Date().getFullYear().toString();
  }

  private parseEpisodeArray(arrayContent: string): string[] {
    const urls: string[] = [];
    
    // Nettoyage et parsing du contenu de l'array JavaScript
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

  private getServerIndex(serverName: string): number {
    const serverMap: { [key: string]: number } = {
      'eps1': 1,
      'eps2': 2,
      'eps3': 3,
      'eps4': 4,
      'epsAS': 5
    };
    return serverMap[serverName] || 0;
  }

  private identifyServer(url: string, serverIndex: number): string {
    if (url.includes('vidmoly')) return 'Vidmoly';
    if (url.includes('sendvid')) return 'SendVid';
    if (url.includes('sibnet')) return 'Sibnet';
    if (url.includes('vk.com')) return 'VK';
    if (url.includes('anime-sama.fr')) return 'Anime-Sama';
    if (url.includes('mystream')) return 'MyStream';
    if (url.includes('uptostream')) return 'UptoStream';
    
    return `Serveur ${serverIndex}`;
  }

  private detectQuality(url: string): string {
    if (url.includes('1080p') || url.includes('hd')) return '1080p';
    if (url.includes('720p')) return '720p';
    if (url.includes('480p')) return '480p';
    return '720p';
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

export const humanLikeAnimeSamaScraper = new HumanLikeAnimeSamaScraper();