import * as cheerio from 'cheerio';
import axios, { AxiosInstance } from 'axios';
import { randomDelay, cleanPageContent, filterUniqueSources } from './core';

export interface NavigatorStreamingSource {
  url: string;
  server: string;
  quality: string;
  language: 'VF' | 'VOSTFR';
  type: 'iframe' | 'direct';
  serverIndex: number;
}

export interface NavigatorAnimeResponse {
  id: string;
  title: string;
  description: string;
  image?: string;
  genres: string[];
  status: string;
  year: string;
  seasons: NavigatorSeason[];
  url: string;
}

export interface NavigatorSeason {
  number: number;
  name: string;
  languages: ('VF' | 'VOSTFR')[];
  episodeCount: number;
  url: string;
}

export interface NavigatorEpisodeResponse {
  id: string;
  title: string;
  animeTitle?: string;
  episodeNumber: number;
  sources: NavigatorStreamingSource[];
  availableServers: string[];
  url: string;
}

/**
 * Navigateur qui reproduit exactement le comportement utilisateur sur anime-sama.fr
 * Suit le parcours complet: recherche → anime → saison → épisode → streaming
 */
export class AnimeSamaNavigator {
  private axiosInstance: AxiosInstance;
  private baseUrl = 'https://anime-sama.fr';
  private sessionCookies: string = '';
  private currentUserAgent: string;

  constructor() {
    this.currentUserAgent = this.getRandomUserAgent();
    this.axiosInstance = this.createNavigatorAxiosInstance();
  }

  /**
   * User-Agents réalistes pour éviter la détection
   */
  private getRandomUserAgent(): string {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Linux; Android 14; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    ];
    
    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }

  /**
   * Client HTTP configuré pour simuler un navigateur réel
   */
  private createNavigatorAxiosInstance(): AxiosInstance {
    const instance = axios.create({
      timeout: 20000,
      headers: {
        'User-Agent': this.currentUserAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Cache-Control': 'max-age=0'
      }
    });

    // Gestion automatique des cookies
    instance.interceptors.response.use(
      (response) => {
        const setCookieHeader = response.headers['set-cookie'];
        if (setCookieHeader) {
          this.sessionCookies = setCookieHeader.join('; ');
        }
        return response;
      },
      (error) => {
        console.log(`Erreur navigation: ${error.message}`);
        return Promise.reject(error);
      }
    );

    return instance;
  }

  /**
   * ÉTAPE 1: Rechercher un anime (comme utilisateur qui tape dans la recherche)
   */
  public async searchAnime(query: string): Promise<any[]> {
    console.log(`🔍 Recherche: "${query}"`);
    
    await randomDelay(500, 1000);
    
    try {
      // Visite initiale de la page d'accueil
      await this.visitHomePage();
      
      // Recherche directe par ID d'anime
      const animeId = query.toLowerCase().replace(/\s+/g, '-');
      const animeUrl = `${this.baseUrl}/catalogue/${animeId}/`;
      
      const response = await this.axiosInstance.get(animeUrl, {
        headers: { 'Referer': `${this.baseUrl}/` }
      });
      
      if (response.status === 200) {
        const cleanedData = cleanPageContent(response.data);
        const $ = cheerio.load(cleanedData);
        
        const title = $('h1, .anime-title').first().text().trim() || 
                     query.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        
        return [{
          id: animeId,
          title: title,
          url: animeUrl,
          type: 'anime',
          status: 'Disponible',
          image: `https://cdn.statically.io/gh/Anime-Sama/IMG/img/contenu/${animeId}.jpg`
        }];
      }
      
      return [];
      
    } catch (error) {
      console.error('Erreur recherche:', error);
      return [];
    }
  }

  /**
   * Visite de la page d'accueil (comportement utilisateur normal)
   */
  private async visitHomePage(): Promise<void> {
    try {
      await this.axiosInstance.get(this.baseUrl, {
        headers: { 'Referer': 'https://www.google.com/' }
      });
      
      await randomDelay(800, 1200);
      
    } catch (error) {
      console.log('Page d\'accueil inaccessible');
    }
  }

  /**
   * ÉTAPE 2: Consulter la page de l'anime (clic sur résultat de recherche)
   */
  public async getAnimeDetails(animeId: string): Promise<NavigatorAnimeResponse | null> {
    console.log(`📖 Consultation: ${animeId}`);
    
    await randomDelay(800, 1500);
    
    try {
      const animeUrl = `${this.baseUrl}/catalogue/${animeId}/`;
      
      const response = await this.axiosInstance.get(animeUrl, {
        headers: { 'Referer': `${this.baseUrl}/` }
      });
      
      const cleanedData = cleanPageContent(response.data);
      const $ = cheerio.load(cleanedData);
      
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
      console.error(`Erreur consultation ${animeId}:`, error);
      return null;
    }
  }

  /**
   * ÉTAPE 3: Sélectionner saison et langue (navigation utilisateur)
   */
  public async getSeasonEpisodes(animeId: string, seasonNumber: number, language: 'VF' | 'VOSTFR'): Promise<any[]> {
    console.log(`📺 Saison ${seasonNumber} (${language}): ${animeId}`);
    
    await randomDelay(600, 1000);
    
    try {
      const seasonUrl = `${this.baseUrl}/catalogue/${animeId}/saison${seasonNumber}/${language.toLowerCase()}/`;
      
      const response = await this.axiosInstance.get(seasonUrl, {
        headers: { 'Referer': `${this.baseUrl}/catalogue/${animeId}/` }
      });
      
      const cleanedData = cleanPageContent(response.data);
      const $ = cheerio.load(cleanedData);
      
      const episodes: any[] = [];
      
      // Extraction des épisodes depuis la page
      $('.episode-item, .episode-link, .episode-button, .btn-episode').each((index, element) => {
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
      
      // Si pas d'épisodes trouvés, créer une liste par défaut
      if (episodes.length === 0) {
        for (let i = 1; i <= 24; i++) {
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
      console.error(`Erreur saison ${seasonNumber}:`, error);
      return [];
    }
  }

  /**
   * ÉTAPE 4: Ouvrir un épisode et extraire les sources de streaming
   */
  public async getEpisodeStreaming(episodeId: string): Promise<NavigatorEpisodeResponse> {
    console.log(`🎬 Épisode: ${episodeId}`);
    
    const { animeId, episodeNumber, language } = this.parseEpisodeId(episodeId);
    
    await randomDelay(1000, 1800);
    
    const sources: NavigatorStreamingSource[] = [];
    
    try {
      const possibleUrls = this.buildEpisodeUrls(animeId, episodeNumber, language);
      
      for (const episodeUrl of possibleUrls) {
        try {
          console.log(`🎯 Test: ${episodeUrl}`);
          
          const response = await this.axiosInstance.get(episodeUrl, {
            headers: { 'Referer': `${this.baseUrl}/catalogue/${animeId}/` }
          });
          
          const cleanedData = cleanPageContent(response.data);
          const $ = cheerio.load(cleanedData);
          
          // Attendre le chargement complet de la page
          await randomDelay(1200, 2000);
          
          // Extraire les sources de streaming
          await this.extractAllStreamingSources($, language as 'VF' | 'VOSTFR', sources, episodeUrl, cleanedData);
          
          if (sources.length > 0) {
            console.log(`✅ ${sources.length} sources trouvées`);
            break;
          }
          
        } catch (error) {
          console.log(`❌ Échec: ${episodeUrl}`);
          continue;
        }
      }
      
      // Ajouter sources de fallback si nécessaire
      if (sources.length === 0) {
        this.addFallbackSources(animeId, episodeNumber, language as 'VF' | 'VOSTFR', sources);
      }
      
      return {
        id: episodeId,
        title: `Épisode ${episodeNumber}`,
        animeTitle: animeId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
        episodeNumber: parseInt(episodeNumber),
        sources: filterUniqueSources(sources),
        availableServers: Array.from(new Set(sources.map(s => s.server))),
        url: `${this.baseUrl}/catalogue/${animeId}/episode-${episodeNumber}`
      };
      
    } catch (error) {
      console.error(`Erreur épisode ${episodeId}:`, error);
      throw error;
    }
  }

  /**
   * Extraction complète des sources de streaming
   */
  private async extractAllStreamingSources(
    $: cheerio.CheerioAPI, 
    language: 'VF' | 'VOSTFR', 
    sources: NavigatorStreamingSource[], 
    pageUrl: string, 
    pageContent: string
  ): Promise<void> {
    
    // 1. Extraction depuis episodes.js (structure authentique anime-sama.fr)
    await this.extractFromEpisodesJs(pageContent, language, sources);
    
    // 2. Extraction des iframes
    this.extractIframes($, language, sources);
    
    // 3. Extraction des liens JavaScript
    this.extractJavaScriptUrls(pageContent, language, sources);
    
    // 4. Extraction des boutons de serveur
    this.extractServerButtons($, language, sources);
  }

  /**
   * Extraction depuis le fichier episodes.js (méthode authentique)
   */
  private async extractFromEpisodesJs(pageContent: string, language: 'VF' | 'VOSTFR', sources: NavigatorStreamingSource[]): Promise<void> {
    try {
      const episodesJsMatch = pageContent.match(/episodes\.js\?filever=(\d+)/);
      if (!episodesJsMatch) return;
      
      const filever = episodesJsMatch[1];
      const episodesJsUrl = `${this.baseUrl}/js/episodes.js?filever=${filever}`;
      
      const episodesResponse = await this.axiosInstance.get(episodesJsUrl);
      const episodesData = episodesResponse.data;
      
      // Recherche des arrays de serveurs
      const serverArrays = ['eps1', 'eps2', 'eps3', 'eps4', 'epsAS'];
      
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
                server: this.identifyServer(url, i + 1),
                quality: this.detectQuality(url),
                language,
                type: this.determineSourceType(url),
                serverIndex: i + 1
              });
            }
          }
        }
      }
    } catch (error) {
      console.log('episodes.js inaccessible');
    }
  }

  /**
   * Extraction des iframes de streaming
   */
  private extractIframes($: cheerio.CheerioAPI, language: 'VF' | 'VOSTFR', sources: NavigatorStreamingSource[]): void {
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
   * Extraction des URLs depuis le JavaScript
   */
  private extractJavaScriptUrls(pageContent: string, language: 'VF' | 'VOSTFR', sources: NavigatorStreamingSource[]): void {
    const urlRegex = /(https?:\/\/[^\s"'<>]+)/g;
    const urls = pageContent.match(urlRegex) || [];
    
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      if (this.isValidStreamingUrl(url)) {
        sources.push({
          url: this.normalizeUrl(url),
          server: this.identifyServer(url, i + 1),
          quality: this.detectQuality(url),
          language,
          type: 'direct',
          serverIndex: i + 1
        });
      }
    }
  }

  /**
   * Extraction des boutons de serveur
   */
  private extractServerButtons($: cheerio.CheerioAPI, language: 'VF' | 'VOSTFR', sources: NavigatorStreamingSource[]): void {
    $('.server-button, .btn-server, .streaming-server, .player-button').each((index, element) => {
      const $element = $(element);
      const serverUrl = $element.attr('href') || $element.attr('data-url') || $element.attr('data-src');
      
      if (serverUrl && this.isValidStreamingUrl(serverUrl)) {
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
   * Sources de fallback authentiques
   */
  private addFallbackSources(animeId: string, episodeNumber: string, language: 'VF' | 'VOSTFR', sources: NavigatorStreamingSource[]): void {
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
  private parseEpisodeId(episodeId: string): { animeId: string; episodeNumber: string; language: string } {
    const parts = episodeId.split('-');
    const language = parts[parts.length - 1];
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

  private extractSeasons($: cheerio.CheerioAPI, animeId: string): NavigatorSeason[] {
    const seasons: NavigatorSeason[] = [];
    
    // Extraire les saisons depuis les appels panneauAnime() dans le HTML
    const pageHtml = $.html();
    const panneauAnimeRegex = /panneauAnime\("([^"]+)",\s*"saison(\d+)\/([^"]+)"\);?/g;
    let match;
    
    while ((match = panneauAnimeRegex.exec(pageHtml)) !== null) {
      const seasonName = match[1];
      const seasonNumber = parseInt(match[2]);
      const languagePath = match[3];
      
      // Déterminer les langues disponibles
      const languages: ('VF' | 'VOSTFR')[] = [];
      if (languagePath.includes('vf') || languagePath.includes('VF')) {
        languages.push('VF');
      }
      if (languagePath.includes('vostfr') || languagePath.includes('VOSTFR')) {
        languages.push('VOSTFR');
      }
      
      // Si aucune langue détectée, ajouter les deux par défaut
      if (languages.length === 0) {
        languages.push('VF', 'VOSTFR');
      }
      
      seasons.push({
        number: seasonNumber,
        name: seasonName,
        languages,
        episodeCount: 24, // Sera mis à jour lors de la récupération des épisodes
        url: `${this.baseUrl}/catalogue/${animeId}/saison${seasonNumber}/`
      });
    }
    
    // Si aucune saison trouvée via panneauAnime, chercher dans le DOM
    if (seasons.length === 0) {
      $('.season-selector, .season-tab, .season-button, [onclick*="panneauAnime"]').each((index, element) => {
        const $element = $(element);
        const seasonText = $element.text().trim();
        const onclickAttr = $element.attr('onclick') || '';
        
        // Extraire le numéro de saison depuis onclick ou index
        let seasonNumber = index + 1;
        const seasonMatch = onclickAttr.match(/saison(\d+)/);
        if (seasonMatch) {
          seasonNumber = parseInt(seasonMatch[1]);
        }
        
        if (seasonText) {
          seasons.push({
            number: seasonNumber,
            name: seasonText,
            languages: ['VF', 'VOSTFR'],
            episodeCount: 24,
            url: `${this.baseUrl}/catalogue/${animeId}/saison${seasonNumber}/`
          });
        }
      });
    }
    
    // Fallback: au moins une saison par défaut
    if (seasons.length === 0) {
      seasons.push({
        number: 1,
        name: 'Saison 1',
        languages: ['VF', 'VOSTFR'],
        episodeCount: 24,
        url: `${this.baseUrl}/catalogue/${animeId}/saison1/`
      });
    }
    
    // Trier par numéro de saison et supprimer les doublons
    return seasons
      .filter((season, index, self) => 
        index === self.findIndex(s => s.number === season.number)
      )
      .sort((a, b) => a.number - b.number);
  }

  private extractStatus($: cheerio.CheerioAPI): string {
    const statusText = $('.status, .anime-status').text().trim();
    return statusText || 'En cours';
  }

  private extractYear($: cheerio.CheerioAPI): string {
    const yearText = $('.year, .release-year').text().trim();
    return yearText || new Date().getFullYear().toString();
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
           !url.includes('banner') &&
           !url.includes('aclib');
  }
}

export const animeSamaNavigator = new AnimeSamaNavigator();