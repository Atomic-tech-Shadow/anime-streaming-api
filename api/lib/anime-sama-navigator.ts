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
  progressInfo?: {
    advancement: string;
    correspondence: string;
    totalEpisodes?: number;
    hasFilms?: boolean;
    hasScans?: boolean;
  };
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
  language?: 'VF' | 'VOSTFR';
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
      
      const progressInfo = this.extractProgressInfo($);
      
      return {
        id: animeId,
        title,
        description,
        image: `https://cdn.statically.io/gh/Anime-Sama/IMG/img/contenu/${animeId}.jpg`,
        genres,
        status,
        year,
        seasons,
        url: animeUrl,
        progressInfo
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
      const seasonUrl = `${this.baseUrl}/catalogue/${animeId}/saison${seasonNumber}/${language.toLowerCase()}`;
      
      const response = await this.axiosInstance.get(seasonUrl, {
        headers: { 'Referer': `${this.baseUrl}/catalogue/${animeId}/` }
      });
      
      const cleanedData = cleanPageContent(response.data);
      const $ = cheerio.load(cleanedData);
      
      const episodes: any[] = [];
      
      // Extraire les vrais numéros d'épisodes depuis la page HTML
      const episodeLinks = $('a[href*="episode-"], .episode-link, .episode-item').toArray();
      
      if (episodeLinks.length > 0) {
        episodeLinks.forEach((element, index) => {
          const $elem = $(element);
          const href = $elem.attr('href') || '';
          const text = $elem.text().trim();
          
          // Extraire le numéro d'épisode depuis l'URL ou le texte
          const episodeMatch = href.match(/episode-(\d+)/) || text.match(/(?:épisode|episode)\s*(\d+)/i);
          const episodeNumber = episodeMatch ? parseInt(episodeMatch[1]) : index + 1;
          
          episodes.push({
            id: `${animeId}-episode-${episodeNumber}-${language.toLowerCase()}`,
            title: `Épisode ${episodeNumber}`,
            episodeNumber,
            url: href.startsWith('http') ? href : `${seasonUrl}/episode-${episodeNumber}`,
            language,
            available: true
          });
        });
      } else {
        // Fallback: générer une liste standard si aucun épisode trouvé
        const baseEpisodeNum = this.getSeasonStartEpisode(animeId, seasonNumber);
        for (let i = 1; i <= 50; i++) {
          const actualEpisodeNum = baseEpisodeNum + i - 1;
          episodes.push({
            id: `${animeId}-episode-${actualEpisodeNum}-${language.toLowerCase()}`,
            title: `Épisode ${actualEpisodeNum}`,
            episodeNumber: actualEpisodeNum,
            url: `${seasonUrl}/episode-${actualEpisodeNum}`,
            language,
            available: true
          });
        }
      }
      
      
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
    
    await randomDelay(800, 1200);
    
    const sources: NavigatorStreamingSource[] = [];
    
    try {
      // Smart section detection based on episode number
      const epNum = parseInt(episodeNumber);
      const languageUpper = language.toUpperCase();
      const validLanguage = (languageUpper === 'VF' || languageUpper === 'VOSTFR') ? languageUpper : 'VOSTFR';
      const possibleUrls = await this.buildUniversalSectionUrls(animeId, validLanguage, epNum);
      
      let workingUrl = null;
      let cleanedData = '';
      
      // Try each URL until we find one that works
      for (const testUrl of possibleUrls) {
        try {
          console.log(`📂 Tentative: ${testUrl}`);
          const response = await this.axiosInstance.get(testUrl, {
            headers: { 'Referer': `${this.baseUrl}/catalogue/` }
          });
          
          if (response.status === 200 && !response.data.includes('Page introuvable')) {
            workingUrl = testUrl;
            cleanedData = cleanPageContent(response.data);
            console.log(`✅ URL fonctionnelle: ${testUrl}`);
            break;
          }
        } catch (error) {
          continue;
        }
      }
      
      if (!workingUrl) {
        console.log('❌ Aucune URL accessible pour cet épisode');
        throw new Error(`Episode ${episodeId} not found on anime-sama.fr`);
      } else {
          // Try to extract episodes.js if the page loaded successfully
          const episodesJsMatch = cleanedData.match(/episodes\.js\?filever=(\d+)/);
          if (episodesJsMatch) {
            const filever = episodesJsMatch[1];
            const episodesJsUrl = `${workingUrl}/episodes.js?filever=${filever}`;
            console.log(`📄 Fichier episodes.js: ${episodesJsUrl}`);
            
            try {
              const episodesResponse = await this.axiosInstance.get(episodesJsUrl, {
                headers: { 'Referer': workingUrl },
                timeout: 5000
              });
              
              if (!episodesResponse || !episodesResponse.data || episodesResponse.data.trim().length === 0) {
                console.log('Episodes.js vide, tentative extraction directe depuis la page');
                // Fallback: extraction directe depuis la page HTML
                return await this.extractFromPageHTML(workingUrl, episodeId, validLanguage, episodeNumber);
              }
              
              const episodesData = episodesResponse.data;
              // For One Piece, calculate the correct episode index within the current season
              let episodeIndex = parseInt(episodeNumber) - 1;
              
              // Smart episode index calculation that adapts to any anime structure
              const epNum = parseInt(episodeNumber);
              
              // First, analyze the episodes.js file to understand the anime structure
              const firstArrayMatch = episodesData.match(/var eps1\s*=\s*\[(.*?)\];/s);
              let detectedArraySize = 0;
              
              if (firstArrayMatch) {
                const arrayContent = firstArrayMatch[1];
                const urls = this.parseJavaScriptArray(arrayContent);
                detectedArraySize = urls.length;
                console.log(`📊 Structure détectée: ${detectedArraySize} épisodes par saison`);
              }
              
              // SYSTÈME UNIVERSEL SIMPLIFIÉ
              // Utilise la structure détectée dynamiquement sans configurations spécifiques
              if (detectedArraySize > 0) {
                // Si l'épisode demandé dépasse la taille du tableau, utiliser modulo
                episodeIndex = (epNum - 1) % detectedArraySize;
              } else {
                // Fallback standard si pas de taille détectée
                episodeIndex = epNum - 1;
              }
              
              // Assurer que l'index est valide
              if (episodeIndex < 0) {
                episodeIndex = 0;
              }
              
              console.log(`Universal episode mapping: episode ${episodeNumber} -> index ${episodeIndex} (array size: ${detectedArraySize})`);

              
              const serverArrays = ['eps1', 'eps2', 'eps3', 'eps4'];
              
              for (let serverIndex = 0; serverIndex < serverArrays.length; serverIndex++) {
                const serverName = serverArrays[serverIndex];
                const arrayRegex = new RegExp(`var ${serverName}\\s*=\\s*\\[(.*?)\\];`, 'gs');
                const match = arrayRegex.exec(episodesData);
                
                if (match) {
                  const arrayContent = match[1];
                  console.log(`🔍 Analyse ${serverName}:`, arrayContent.substring(0, 100));
                  
                  const urls = this.parseJavaScriptArray(arrayContent);
                  console.log(`📊 ${serverName}: ${urls.length} URLs trouvées`);
                  
                  // Si aucune URL extraite, essayer un parsing alternatif
                  if (urls.length === 0) {
                    const directUrls = arrayContent.match(/'([^']+)'/g) || [];
                    urls.push(...directUrls.map(url => url.replace(/'/g, '')));
                    console.log(`🔄 Parsing alternatif: ${urls.length} URLs`);
                  }
                  
                  if (episodeIndex < urls.length && urls[episodeIndex]) {
                    const url = urls[episodeIndex];
                    console.log(`🎯 URL épisode ${episodeNumber}:`, url);
                    
                    if (url && url.length > 10) { // URL valide basique
                      sources.push({
                        url: url.startsWith('http') ? url : `https:${url}`,
                        server: `Serveur ${serverIndex + 1}`,
                        quality: url.includes('1080') ? 'FHD' : url.includes('720') ? 'HD' : 'SD',
                        language: language.toUpperCase() as 'VF' | 'VOSTFR',
                        type: 'direct',
                        serverIndex: serverIndex + 1
                      });
                    }
                  }
                }
              }
              
              // Si aucune source extraite, l'épisode n'existe pas
              if (sources.length === 0) {
                console.log('❌ Aucune source vidéo trouvée dans episodes.js');
                throw new Error(`No streaming sources found for episode ${episodeNumber} of ${animeId}`);
              }
            } catch (jsError: any) {
              console.error('Erreur episodes.js:', jsError);
              // Fallback vers extraction HTML directe
              console.log('Tentative extraction HTML directe après échec episodes.js');
              return await this.extractFromPageHTML(workingUrl, episodeId, validLanguage, episodeNumber);
            }
          }
        }
        
        console.log(`✅ ${sources.length} sources extraites`);
        
        return {
          id: episodeId,
          title: `Épisode ${episodeNumber}`,
          animeTitle: animeId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
          episodeNumber: parseInt(episodeNumber),
          language: language.toUpperCase() as 'VF' | 'VOSTFR',
          sources,
          availableServers: Array.from(new Set(sources.map(s => s.server))),
          url: workingUrl || `${this.baseUrl}/catalogue/${animeId}/`
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
  private async buildUniversalSectionUrls(animeId: string, language: 'VF' | 'VOSTFR', episodeNumber: number): Promise<string[]> {
    const lang = language.toLowerCase();
    const urls: string[] = [];
    
    // Configuration spécifique pour My Hero Academia (correction du bug saison 7)
    if (animeId === 'my-hero-academia') {
      return this.buildMyHeroAcademiaUrls(episodeNumber, lang);
    }
    
    try {
      // Import et utiliser l'analyseur universel pour les autres animes
      const { universalAnimeAnalyzer } = await import('./universal-anime-analyzer.js');
      
      // Analyser la structure de l'anime
      const structure = await universalAnimeAnalyzer.analyzeAnimeStructure(animeId);
      
      // Trouver la saison correspondant à l'épisode
      const episodeMapping = universalAnimeAnalyzer.findSeasonForEpisode(episodeNumber, structure);
      
      if (episodeMapping) {
        // URL prioritaire basée sur l'analyse
        urls.push(`${this.baseUrl}/catalogue/${animeId}/${episodeMapping.sectionPath}/${lang}`);
        console.log(`🎯 Episode ${episodeNumber} → Section: ${episodeMapping.sectionPath}`);
      }
      
      // Ajouter toutes les sections détectées comme fallback
      for (const season of structure.seasons) {
        urls.push(`${this.baseUrl}/catalogue/${animeId}/${season.sectionPath}/${lang}`);
      }
      
    } catch (error) {
      console.log(`⚠️ Fallback pour ${animeId}, utilisation détection générique`);
      
      // Fallback générique si l'analyse échoue
      for (let i = 1; i <= 10; i++) {
        urls.push(`${this.baseUrl}/catalogue/${animeId}/saison${i}/${lang}`);
        urls.push(`${this.baseUrl}/catalogue/${animeId}/saga${i}/${lang}`);
      }
    }
    
    // Alternative naming conventions (toujours essayer)
    urls.push(
      `${this.baseUrl}/catalogue/${animeId}/${lang}`,
      `${this.baseUrl}/catalogue/${animeId}/episodes/${lang}`,
      `${this.baseUrl}/catalogue/${animeId}/vf-vostfr/${lang}`
    );
    
    // Supprimer les doublons
    return [...new Set(urls)];
  }

  /**
   * Configuration spécifique pour My Hero Academia avec mapping correct des saisons
   */
  private buildMyHeroAcademiaUrls(episodeNumber: number, lang: string): string[] {
    const urls: string[] = [];
    
    // Mapping précis des épisodes My Hero Academia par saison
    const seasonMapping = [
      { start: 1, end: 13, section: 'saison1' },     // Saison 1: épisodes 1-13
      { start: 14, end: 38, section: 'saison2' },    // Saison 2: épisodes 14-38  
      { start: 39, end: 63, section: 'saison3' },    // Saison 3: épisodes 39-63
      { start: 64, end: 88, section: 'saison4' },    // Saison 4: épisodes 64-88
      { start: 89, end: 113, section: 'saison5' },   // Saison 5: épisodes 89-113
      { start: 114, end: 138, section: 'saison6' },  // Saison 6: épisodes 114-138
      { start: 139, end: 159, section: 'saison7' }   // Saison 7: épisodes 139-159
    ];
    
    // Trouver la bonne saison pour cet épisode
    const correctSeason = seasonMapping.find(season => 
      episodeNumber >= season.start && episodeNumber <= season.end
    );
    
    if (correctSeason) {
      // URL prioritaire avec la bonne saison
      urls.push(`${this.baseUrl}/catalogue/my-hero-academia/${correctSeason.section}/${lang}`);
      console.log(`🎯 My Hero Academia EP${episodeNumber} → ${correctSeason.section} (${correctSeason.start}-${correctSeason.end})`);
    }
    
    // Ajouter toutes les saisons comme fallback
    for (const season of seasonMapping) {
      urls.push(`${this.baseUrl}/catalogue/my-hero-academia/${season.section}/${lang}`);
    }
    
    return urls;
  }

  private parseEpisodeId(episodeId: string): { animeId: string; episodeNumber: string; language: string } {
    // Support flexible episode ID formats:
    // naruto-episode-1-vf, naruto-1, naruto-ep1-vf, etc.
    
    if (episodeId.includes('-episode-')) {
      // Format: anime-episode-number-language
      const match = episodeId.match(/^(.+)-episode-(\d+)(?:-(.+))?$/);
      if (match) {
        return {
          animeId: match[1],
          episodeNumber: match[2],
          language: match[3] || 'vf'
        };
      }
    }
    
    // Simple format: anime-number
    const simpleMatch = episodeId.match(/^(.+)-(\d+)$/);
    if (simpleMatch) {
      return {
        animeId: simpleMatch[1],
        episodeNumber: simpleMatch[2],
        language: 'vf'
      };
    }
    
    // Fallback: split by dashes and parse
    const parts = episodeId.split('-');
    if (parts.length >= 2) {
      const lastPart = parts[parts.length - 1];
      const secondLastPart = parts[parts.length - 2];
      
      // Check if last part is a language
      if (['vf', 'vostfr', 'VF', 'VOSTFR'].includes(lastPart)) {
        const episodeNumber = secondLastPart.replace(/episode|ep/g, '');
        const animeId = parts.slice(0, -2).join('-');
        return { animeId, episodeNumber, language: lastPart };
      }
      
      // Check if last part is a number
      if (/^\d+$/.test(lastPart)) {
        const animeId = parts.slice(0, -1).join('-');
        return { animeId, episodeNumber: lastPart, language: 'vf' };
      }
    }
    
    // Default fallback
    return { animeId: episodeId, episodeNumber: '1', language: 'vf' };
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
    const pageHtml = $.html();
    
    // 1. Extraire depuis les appels panneauAnime() - structure exacte d'anime-sama.fr
    const panneauAnimePatterns = [
      /panneauAnime\("([^"]+)",\s*"saison(\d+)\/([^"]+)"\)/g,
      /panneauAnime\("([^"]+)",\s*"([^\/]+)\/([^"]+)"\)/g,
      /panneauAnime\("([^"]+)",\s*"film\/([^"]+)"\)/g,
      /panneauAnime\("([^"]+)",\s*"ova\/([^"]+)"\)/g
    ];
    
    for (const regex of panneauAnimePatterns) {
      let match;
      while ((match = regex.exec(pageHtml)) !== null) {
        const seasonName = match[1];
        let seasonNumber = 1;
        let sectionType = 'saison';
        
        // Analyser le type de section
        if (match[0].includes('film/')) {
          sectionType = 'film';
          seasonNumber = 999; // Numéro spécial pour les films
        } else if (match[0].includes('ova/')) {
          sectionType = 'ova';
          seasonNumber = 998; // Numéro spécial pour les OVA
        } else if (match[2] && !isNaN(parseInt(match[2]))) {
          seasonNumber = parseInt(match[2]);
        }
        
        const languagePath = match[3] || match[2];
        
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
          episodeCount: 0, // Sera déterminé dynamiquement
          url: `${this.baseUrl}/catalogue/${animeId}/${sectionType}${seasonNumber === 999 || seasonNumber === 998 ? '' : seasonNumber}`
        });
      }
    }
    
    // 2. Recherche avancée dans les boutons et liens de navigation
    $('.navigation-button, .season-link, .section-link, [onclick*="panneauAnime"]').each((index, element) => {
      const $element = $(element);
      const onclickAttr = $element.attr('onclick') || '';
      const hrefAttr = $element.attr('href') || '';
      const textContent = $element.text().trim();
      
      // Extraire les informations depuis onclick
      const onclickMatch = onclickAttr.match(/panneauAnime\("([^"]+)",\s*"([^"]+)"\)/);
      if (onclickMatch) {
        const sectionName = onclickMatch[1];
        const sectionPath = onclickMatch[2];
        
        let seasonNumber = 1;
        let sectionType = 'saison';
        
        // Analyser le chemin de section
        if (sectionPath.includes('saison')) {
          const seasonMatch = sectionPath.match(/saison(\d+)/);
          if (seasonMatch) {
            seasonNumber = parseInt(seasonMatch[1]);
          }
        } else if (sectionPath.includes('film')) {
          sectionType = 'film';
          seasonNumber = 999;
        } else if (sectionPath.includes('ova')) {
          sectionType = 'ova';
          seasonNumber = 998;
        }
        
        // Détecter les langues depuis le chemin
        const languages: ('VF' | 'VOSTFR')[] = [];
        if (sectionPath.includes('vf')) languages.push('VF');
        if (sectionPath.includes('vostfr')) languages.push('VOSTFR');
        if (languages.length === 0) languages.push('VF', 'VOSTFR');
        
        seasons.push({
          number: seasonNumber,
          name: sectionName,
          languages,
          episodeCount: 0,
          url: `${this.baseUrl}/catalogue/${animeId}/${sectionPath.replace(/\/$/, '')}`
        });
      }
    });
    
    // 3. Recherche dans tous les liens de navigation vers les saisons
    $('a[href*="/catalogue/"]').each((index, element) => {
      const $element = $(element);
      const href = $element.attr('href') || '';
      const linkText = $element.text().trim();
      
      // Vérifier si le lien correspond à cet anime
      const linkMatch = href.match(/\/catalogue\/([^\/]+)\/(saison(\d+)|film|ova|kai|saison1hs)/);
      if (linkMatch && linkMatch[1] === animeId) {
        let seasonNumber = 1;
        let sectionName = linkText;
        
        if (linkMatch[2] === 'film') {
          seasonNumber = 999;
          sectionName = 'Films';
        } else if (linkMatch[2] === 'ova') {
          seasonNumber = 998;
          sectionName = 'OVA';
        } else if (linkMatch[2] === 'kai') {
          seasonNumber = 997;
          sectionName = 'Kai';
        } else if (linkMatch[2] === 'saison1hs') {
          seasonNumber = 996;
          sectionName = 'Saison 1 (Hors Série)';
        } else if (linkMatch[3]) {
          seasonNumber = parseInt(linkMatch[3]);
          sectionName = linkText || `Saison ${seasonNumber}`;
        }
        
        // Détecter les langues disponibles depuis l'URL
        const languages: ('VF' | 'VOSTFR')[] = [];
        if (href.includes('/vf')) languages.push('VF');
        if (href.includes('/vostfr')) languages.push('VOSTFR');
        if (languages.length === 0) languages.push('VF', 'VOSTFR');
        
        seasons.push({
          number: seasonNumber,
          name: sectionName,
          languages,
          episodeCount: 0,
          url: `${this.baseUrl}${href.replace(/\/$/, '')}`
        });
      }
    });
    
    // 4. Recherche dans les scripts JavaScript pour les appels panneauAnime
    const scriptTags = $('script').get();
    for (const script of scriptTags) {
      const scriptContent = $(script).html() || '';
      const panneauCalls = scriptContent.match(/panneauAnime\([^)]+\)/g) || [];
      
      for (const call of panneauCalls) {
        const callMatch = call.match(/panneauAnime\("([^"]+)",\s*"([^"]+)"\)/);
        if (callMatch) {
          const sectionName = callMatch[1];
          const sectionPath = callMatch[2];
          
          let seasonNumber = 1;
          if (sectionPath.includes('saison')) {
            const seasonMatch = sectionPath.match(/saison(\d+)/);
            if (seasonMatch) seasonNumber = parseInt(seasonMatch[1]);
          } else if (sectionPath.includes('film')) {
            seasonNumber = 999;
          } else if (sectionPath.includes('ova')) {
            seasonNumber = 998;
          }
          
          const languages: ('VF' | 'VOSTFR')[] = [];
          if (sectionPath.includes('vf')) languages.push('VF');
          if (sectionPath.includes('vostfr')) languages.push('VOSTFR');
          if (languages.length === 0) languages.push('VF', 'VOSTFR');
          
          seasons.push({
            number: seasonNumber,
            name: sectionName,
            languages,
            episodeCount: 0,
            url: `${this.baseUrl}/catalogue/${animeId}/${sectionPath.replace(/\/$/, '')}`
          });
        }
      }
    }
    
    // 5. Si toujours aucune saison, analyser la structure de la page plus profondément
    if (seasons.length === 0) {
      // Rechercher tous les éléments avec du texte contenant "saison", "film", "ova"
      $('*').each((index, element) => {
        const $element = $(element);
        const elementText = $element.text().trim().toLowerCase();
        const onclickAttr = $element.attr('onclick') || '';
        
        if (elementText.includes('saison') || elementText.includes('season')) {
          const seasonMatch = elementText.match(/(?:saison|season)\s*(\d+)/);
          if (seasonMatch) {
            const seasonNumber = parseInt(seasonMatch[1]);
            if (seasonNumber > 0 && seasonNumber < 20) {
              seasons.push({
                number: seasonNumber,
                name: `Saison ${seasonNumber}`,
                languages: ['VF', 'VOSTFR'],
                episodeCount: 0,
                url: `${this.baseUrl}/catalogue/${animeId}/saison${seasonNumber}`
              });
            }
          }
        }
        
        if (elementText.includes('film') && elementText.length < 50) {
          seasons.push({
            number: 999,
            name: 'Films',
            languages: ['VF', 'VOSTFR'],
            episodeCount: 0,
            url: `${this.baseUrl}/catalogue/${animeId}/film`
          });
        }
        
        if (elementText.includes('ova') && elementText.length < 50) {
          seasons.push({
            number: 998,
            name: 'OVA',
            languages: ['VF', 'VOSTFR'],
            episodeCount: 0,
            url: `${this.baseUrl}/catalogue/${animeId}/ova`
          });
        }
      });
    }
    
    // Nettoyer et trier les saisons
    const uniqueSeasons = seasons
      .filter((season, index, self) => 
        index === self.findIndex(s => s.number === season.number)
      )
      .sort((a, b) => {
        // Trier: saisons normales d'abord, puis contenus spéciaux
        if (a.number < 900 && b.number >= 900) return -1;
        if (a.number >= 900 && b.number < 900) return 1;
        return a.number - b.number;
      });
    
    console.log(`📺 ${uniqueSeasons.length} saison(s) détectée(s) pour ${animeId}:`, uniqueSeasons.map(s => `${s.name} (${s.languages.join(', ')})`));
    
    return uniqueSeasons;
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
    
    try {
      // Method 1: Try to parse as proper JavaScript array
      const cleanContent = arrayContent
        .replace(/'/g, '"')  // Replace single quotes with double quotes
        .replace(/,\s*]/g, ']')  // Remove trailing commas
        .replace(/,\s*}/g, '}'); // Remove trailing commas in objects
      
      try {
        const parsedArray = JSON.parse('[' + cleanContent + ']');
        for (const item of parsedArray) {
          if (typeof item === 'string' && item.startsWith('http')) {
            urls.push(item);
          }
        }
        if (urls.length > 0) return urls;
      } catch (jsonError) {
        // Continue to other methods if JSON parsing fails
      }
      
      // Method 2: Extract URLs with comprehensive regex patterns
      const urlPatterns = [
        /'(https?:\/\/[^']+)'/g,
        /"(https?:\/\/[^"]+)"/g,
        /https?:\/\/[^\s,'"]+/g
      ];
      
      for (const pattern of urlPatterns) {
        let match;
        while ((match = pattern.exec(arrayContent)) !== null) {
          const url = match[1] || match[0];
          if (url && url.startsWith('http') && url.length > 10) {
            // Clean up the URL
            const cleanUrl = url.replace(/[,\]}'"\s]+$/, '');
            if (!urls.includes(cleanUrl)) {
              urls.push(cleanUrl);
            }
          }
        }
      }
      
      // Method 3: Handle anime-sama.fr specific multi-line arrays
      if (urls.length === 0) {
        const lines = arrayContent.split(/[\n\r]+/);
        for (const line of lines) {
          const urlMatch = line.match(/https?:\/\/[^\s,'"]+/);
          if (urlMatch) {
            const url = urlMatch[0].replace(/[,\]}'"\s]+$/, '');
            if (url.length > 10 && !urls.includes(url)) {
              urls.push(url);
            }
          }
        }
      }
      
    } catch (error) {
      console.log('Error parsing JavaScript array:', error);
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
    if (url.includes('smoothpre.com')) return 'SmoothPre';
    if (url.includes('doodstream')) return 'DoodStream';
    if (url.includes('streamtape')) return 'StreamTape';
    if (url.includes('mixdrop')) return 'MixDrop';
    if (url.includes('uqload')) return 'UqLoad';
    
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
      'anime-sama.fr', 'mystream.to', 'uptostream.com',
      'smoothpre.com', 'doodstream.com', 'streamtape.com',
      'mixdrop.co', 'uqload.com', 'streamhide.to'
    ];
    
    return validDomains.some(domain => url.includes(domain)) && 
           !url.includes('ad') && 
           !url.includes('popup') && 
           !url.includes('banner') &&
           !url.includes('aclib') &&
           url.startsWith('http');
  }

  /**
   * Extraction directe depuis la page HTML pour les animes sans episodes.js
   */
  private async extractFromPageHTML(pageUrl: string, episodeId: string, language: 'VF' | 'VOSTFR', episodeNumber: string): Promise<NavigatorEpisodeResponse> {
    console.log(`Extraction HTML directe pour: ${episodeId}`);
    
    try {
      const response = await this.axiosInstance.get(pageUrl);
      const pageContent = response.data;
      const $ = cheerio.load(pageContent);
      
      const sources: NavigatorStreamingSource[] = [];
      
      // Recherche d'iframes de streaming dans la page
      $('iframe[src]').each((index, element) => {
        const src = $(element).attr('src');
        if (src && this.isValidStreamingUrl(src)) {
          sources.push({
            url: src.startsWith('http') ? src : `https:${src}`,
            server: `Serveur ${index + 1}`,
            quality: this.detectQuality(src),
            language: language,
            type: 'iframe',
            serverIndex: index + 1
          });
        }
      });
      
      // Recherche de liens vidéo dans les scripts
      const scriptContent = $('script').text();
      const videoUrlMatches = scriptContent.match(/(?:src|url)["'\s]*[:=]["'\s]*["']([^"']+\.(?:mp4|m3u8|webm|avi))/gi);
      
      if (videoUrlMatches) {
        videoUrlMatches.forEach((match, index) => {
          const urlMatch = match.match(/["']([^"']+)["']/);
          if (urlMatch && urlMatch[1]) {
            const videoUrl = urlMatch[1];
            sources.push({
              url: videoUrl.startsWith('http') ? videoUrl : `https:${videoUrl}`,
              server: `Direct ${index + 1}`,
              quality: this.detectQuality(videoUrl),
              language: language,
              type: 'direct',
              serverIndex: sources.length + 1
            });
          }
        });
      }
      
      // Si aucune source trouvée dans la page, extraire depuis la page de streaming directe
      if (sources.length === 0) {
        const { animeId } = this.parseEpisodeId(episodeId);
        const streamingUrl = `https://www.anime-sama.fr/streaming/${animeId}-episode-${episodeNumber}-${language.toLowerCase()}`;
        
        console.log(`Extraction depuis page streaming: ${streamingUrl}`);
        
        try {
          const streamingResponse = await this.axiosInstance.get(streamingUrl, {
            headers: { 'Referer': pageUrl }
          });
          
          const streamingContent = streamingResponse.data;
          const $streaming = cheerio.load(streamingContent);
          
          // Recherche d'iframes vidéo dans la page de streaming
          $streaming('iframe[src]').each((index, element) => {
            const src = $streaming(element).attr('src');
            if (src && this.isValidStreamingUrl(src)) {
              sources.push({
                url: src.startsWith('http') ? src : `https:${src}`,
                server: `Serveur ${index + 1}`,
                quality: this.detectQuality(src),
                language: language,
                type: 'iframe',
                serverIndex: index + 1
              });
            }
          });
          
          // Recherche de sources vidéo dans les scripts de la page streaming
          const streamingScripts = $streaming('script').text();
          const videoMatches = streamingScripts.match(/(https?:\/\/[^\s"']+\.(?:mp4|m3u8|webm))/gi);
          
          if (videoMatches) {
            videoMatches.forEach((videoUrl, index) => {
              sources.push({
                url: videoUrl,
                server: `Direct ${index + 1}`,
                quality: this.detectQuality(videoUrl),
                language: language,
                type: 'direct',
                serverIndex: sources.length + 1
              });
            });
          }
          
          // Recherche de serveurs populaires
          const serverPatterns = [
            /(?:sibnet|vidmoly|sendvid|doodstream|mixdrop|uqload)\.(?:com|ru|to)\/[^"'\s]+/gi,
            /(?:streamtape|streamlare)\.com\/[^"'\s]+/gi
          ];
          
          serverPatterns.forEach(pattern => {
            const matches = streamingContent.match(pattern);
            if (matches) {
              matches.forEach((match, index) => {
                if (this.isValidStreamingUrl(match)) {
                  sources.push({
                    url: match.startsWith('http') ? match : `https://${match}`,
                    server: this.identifyServer(match, sources.length + 1),
                    quality: this.detectQuality(match),
                    language: language,
                    type: 'iframe',
                    serverIndex: sources.length + 1
                  });
                }
              });
            }
          });
          
          console.log(`Sources extraites de la page streaming: ${sources.length}`);
          
        } catch (streamingError) {
          console.error('Erreur extraction page streaming:', streamingError);
          // En dernier recours, utiliser l'URL de la page comme iframe
          sources.push({
            url: streamingUrl,
            server: 'Anime-Sama',
            quality: 'HD',
            language: language,
            type: 'iframe',
            serverIndex: 1
          });
        }
      }
      
      console.log(`Extraction HTML: ${sources.length} sources trouvées`);
      
      return {
        id: episodeId,
        title: `Épisode ${episodeNumber}`,
        animeTitle: episodeId.split('-').slice(0, -2).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
        episodeNumber: parseInt(episodeNumber),
        language: language,
        sources,
        availableServers: Array.from(new Set(sources.map(s => s.server))),
        url: pageUrl
      };
      
    } catch (error) {
      console.error('Erreur extraction HTML:', error);
      throw new Error(`Failed to extract from HTML page: ${error.message}`);
    }
  }

  /**
   * Obtenir le numéro d'épisode de début pour une saison donnée
   */
  private getSeasonStartEpisode(animeId: string, episodeNumber: number): number {
    // Universal calculation - no hardcoded mappings needed
    // This method is now obsolete as we use dynamic detection
    return 1;
  }

  /**
   * Extraire les informations d'avancement depuis la page anime
   */
  private extractProgressInfo($: cheerio.CheerioAPI): { advancement: string; correspondence: string; totalEpisodes?: number; hasFilms?: boolean; hasScans?: boolean; } {
    // Extraction plus précise basée sur la structure HTML réelle
    const advancementEl = $('p:contains("Avancement")').find('a').text().trim() || 
                         $('p:contains("Avancement")').text().replace('Avancement :', '').trim() ||
                         'Aucune donnée';
    
    const correspondenceEl = $('p:contains("Correspondance")').find('a').text().trim() || 
                            $('p:contains("Correspondance")').text().replace('Correspondance :', '').trim() ||
                            'Épisode 1';
    
    // Méthodes multiples pour extraire le nombre total d'épisodes
    let totalEpisodes: number | undefined;
    
    // 1. Depuis la correspondance
    const correspondenceMatch = correspondenceEl.match(/episode?\s*(\d+)/i);
    if (correspondenceMatch) {
      totalEpisodes = parseInt(correspondenceMatch[1]);
    }
    
    // 2. Depuis l'avancement si correspondance échoue
    if (!totalEpisodes) {
      const advancementMatch = advancementEl.match(/(\d+)\/(\d+)|(\d+)\s*épisodes?/i);
      if (advancementMatch) {
        totalEpisodes = parseInt(advancementMatch[2] || advancementMatch[3]);
      }
    }
    
    // 3. Recherche dans tout le contenu HTML
    if (!totalEpisodes) {
      const pageText = $.html();
      const globalMatches = [
        /(\d+)\s*épisodes?/gi,
        /total[^:]*:\s*(\d+)/gi,
        /épisode\s*(\d+)\s*\(fin\)/gi,
        /episode\s*(\d+)\s*\(end\)/gi
      ];
      
      for (const regex of globalMatches) {
        const matches = [...pageText.matchAll(regex)];
        if (matches.length > 0) {
          const numbers = matches.map(m => parseInt(m[1])).filter(n => n > 0);
          if (numbers.length > 0) {
            totalEpisodes = Math.max(...numbers);
            break;
          }
        }
      }
    }
    
    // 4. Fallback avec heuristiques communes
    if (!totalEpisodes) {
      // Détection basée sur les liens de saison
      const seasonLinks = $('[href*="/saison"], [onclick*="saison"]').length;
      if (seasonLinks > 0) {
        // Estimation basée sur le nombre de saisons (25 épisodes par saison en moyenne)
        totalEpisodes = seasonLinks * 25;
      }
    }
    
    // 5. Fallback ultime pour animes populaires
    if (!totalEpisodes) {
      const pageUrl = $.html();
      if (pageUrl.includes('one-piece')) totalEpisodes = 1100;
      else if (pageUrl.includes('naruto-shippuden')) totalEpisodes = 500;
      else if (pageUrl.includes('bleach')) totalEpisodes = 366;
      else if (pageUrl.includes('dragon-ball-z')) totalEpisodes = 291;
      else if (pageUrl.includes('attack-on-titan')) totalEpisodes = 87;
      else totalEpisodes = 12; // Défaut pour animes courts
    }
    
    // Vérifier la présence de films et scans dans les panneaux
    const pageText = $.html();
    const hasFilms = pageText.includes('film') || pageText.includes('Films') || 
                    $('[href*="film"], [onclick*="film"]').length > 0;
    const hasScans = pageText.includes('scan') || pageText.includes('Scans') || 
                    $('[href*="scan"], [onclick*="scan"]').length > 0;
    
    console.log(`Progress Info: advancement=${advancementEl}, correspondence=${correspondenceEl}, totalEpisodes=${totalEpisodes}`);
    
    return {
      advancement: advancementEl,
      correspondence: correspondenceEl,
      totalEpisodes,
      hasFilms,
      hasScans
    };
  }
}

export const animeSamaNavigator = new AnimeSamaNavigator();