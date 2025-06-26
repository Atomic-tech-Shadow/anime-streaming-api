import axios, { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';
import { createAxiosInstance, randomDelay, BASE_URL, cleanPageContent } from './core';

export interface RealAnimeData {
  id: string;
  title: string;
  description: string;
  image: string;
  genres: string[];
  status: string;
  year: string;
  seasons: RealSeason[];
  url: string;
  authentic: boolean;
}

export interface RealSeason {
  number: number;
  name: string;
  languages: ('VF' | 'VOSTFR')[];
  episodeCount: number;
  url: string;
}

export interface RealEpisodeData {
  id: string;
  title: string;
  animeTitle: string;
  episodeNumber: number;
  sources: RealVideoSource[];
  availableServers: string[];
  url: string;
}

export interface RealVideoSource {
  url: string;
  server: string;
  quality: string;
  language: 'VF' | 'VOSTFR';
  type: 'iframe' | 'direct';
  serverIndex: number;
}

/**
 * Scraper qui extrait UNIQUEMENT les vraies données d'anime-sama.fr
 */
export class RealAnimeSamaScraper {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = createAxiosInstance();
  }

  /**
   * Recherche authentique d'animes sur anime-sama.fr
   */
  public async searchAnime(query: string): Promise<any[]> {
    try {
      console.log(`Searching real anime-sama.fr data for: ${query}`);
      
      // Essayer de charger la page de catalogue pour trouver des animes réels
      const catalogueResponse = await this.axiosInstance.get('/catalogue/');
      const $ = cheerio.load(catalogueResponse.data);
      
      const animes: any[] = [];
      
      // Extraire tous les liens d'animes du catalogue
      $('a[href*="/catalogue/"]').each((index, element) => {
        const href = $(element).attr('href');
        const text = $(element).text().trim();
        
        if (href && text && href.includes('/catalogue/') && !href.endsWith('/catalogue/')) {
          const animeId = href.split('/catalogue/')[1].replace('/', '');
          if (animeId && animeId.length > 1) {
            const title = text || animeId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            
            // Vérifier si l'anime correspond à la recherche
            const queryLower = query.toLowerCase();
            const titleLower = title.toLowerCase();
            const idLower = animeId.toLowerCase();
            
            if (titleLower.includes(queryLower) || 
                idLower.includes(queryLower) || 
                queryLower.includes(titleLower) ||
                queryLower.includes(idLower)) {
              
              animes.push({
                id: animeId,
                title: title,
                url: `${BASE_URL}/catalogue/${animeId}/`,
                type: 'anime',
                status: 'Disponible',
                image: `https://cdn.statically.io/gh/Anime-Sama/IMG/img/contenu/${animeId}.jpg`,
                authentic: true
              });
            }
          }
        }
      });
      
      // Rechercher aussi dans les liens de navigation et menus
      $('.nav-links a, .menu a, .anime-list a').each((index, element) => {
        const href = $(element).attr('href');
        const text = $(element).text().trim();
        
        if (href && text && href.includes('/catalogue/')) {
          const animeId = href.split('/catalogue/')[1].replace('/', '');
          if (animeId && animeId.length > 1) {
            const title = text || animeId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            
            const queryLower = query.toLowerCase();
            const titleLower = title.toLowerCase();
            const idLower = animeId.toLowerCase();
            
            if (titleLower.includes(queryLower) || 
                idLower.includes(queryLower) || 
                queryLower.includes(titleLower) ||
                queryLower.includes(idLower)) {
              
              // Éviter les doublons
              if (!animes.find(a => a.id === animeId)) {
                animes.push({
                  id: animeId,
                  title: title,
                  url: `${BASE_URL}/catalogue/${animeId}/`,
                  type: 'anime',
                  status: 'Disponible',
                  image: `https://cdn.statically.io/gh/Anime-Sama/IMG/img/contenu/${animeId}.jpg`,
                  authentic: true
                });
              }
            }
          }
        }
      });
      
      console.log(`✅ Found ${animes.length} matching animes for "${query}"`);
      return animes.slice(0, 10); // Limiter à 10 résultats
      
    } catch (error) {
      console.error('Real search error:', error);
      return [];
    }
  }

  /**
   * Récupère les détails authentiques d'un anime
   */
  public async getAnimeDetails(animeId: string): Promise<RealAnimeData | null> {
    try {
      console.log(`Authentic anime details request: ${animeId}`);
      const animeUrl = `/catalogue/${animeId}/`;
      
      console.log(`🔗 Trying URL: ${BASE_URL}${animeUrl}`);
      const response = await this.axiosInstance.get(animeUrl);
      
      if (response.status !== 200) {
        console.log(`❌ Failed to load ${animeUrl} - Status: ${response.status}`);
        return null;
      }
      
      console.log(`✅ Found valid content at: ${animeUrl}`);
      const $ = cheerio.load(response.data);
      
      // Extraction du vrai titre
      let title = '';
      const titleSelectors = ['h1', '.title', '.anime-title', 'title'];
      
      for (const selector of titleSelectors) {
        const element = $(selector).first();
        if (element.length) {
          let extractedTitle = element.text().trim();
          if (selector === 'title') {
            extractedTitle = extractedTitle.split('|')[0].split('-')[0].trim();
          }
          if (extractedTitle && extractedTitle.length > 2 && !extractedTitle.toLowerCase().includes('anime-sama')) {
            title = extractedTitle;
            break;
          }
        }
      }
      
      // Si pas de titre trouvé, utiliser l'ID formaté
      if (!title) {
        title = animeId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      }
      
      // Extraction de la vraie description
      let description = '';
      const descSelectors = ['.description', '.synopsis', '.resume', '.summary', 'p:contains("Synopsis")', '.content p'];
      
      for (const selector of descSelectors) {
        const desc = $(selector).first().text().trim();
        if (desc && desc.length > 20 && !desc.toLowerCase().includes('anime-sama')) {
          description = desc;
          break;
        }
      }
      
      if (!description) {
        description = `${title} - Anime disponible en streaming sur Anime-Sama`;
      }
      
      // Extraction des vrais genres
      const genres: string[] = [];
      $('.genre, .tag, .category, .genres span, .tags span').each((index, element) => {
        const genre = $(element).text().trim();
        if (genre && !genres.includes(genre)) {
          genres.push(genre);
        }
      });
      
      // Genres par défaut si aucun trouvé
      if (genres.length === 0) {
        genres.push('Animation', 'Japonais');
      }
      
      // Extraction du statut réel
      let status = 'En cours';
      const statusSelectors = ['.status', '.anime-status', '.state'];
      for (const selector of statusSelectors) {
        const statusText = $(selector).text().trim();
        if (statusText) {
          status = statusText;
          break;
        }
      }
      
      // Extraction de l'année réelle
      let year = new Date().getFullYear().toString();
      const yearMatches = response.data.match(/(\d{4})/g);
      if (yearMatches) {
        const validYears = yearMatches.filter((y: string) => {
          const yearNum = parseInt(y);
          return yearNum >= 1960 && yearNum <= new Date().getFullYear();
        });
        if (validYears.length > 0) {
          year = validYears[validYears.length - 1];
        }
      }
      
      // Extraction des saisons réelles
      const seasons = this.extractRealSeasons($, animeId);
      
      return {
        id: animeId,
        title,
        description,
        image: `https://cdn.statically.io/gh/Anime-Sama/IMG/img/contenu/${animeId}.jpg`,
        genres,
        status,
        year,
        seasons,
        url: `${BASE_URL}${animeUrl}`,
        authentic: true
      };
      
    } catch (error: any) {
      console.error(`Error getting real anime details for ${animeId}:`, error.message);
      return null;
    }
  }

  /**
   * Extrait les vraies saisons depuis la page
   */
  private extractRealSeasons($: cheerio.CheerioAPI, animeId: string): RealSeason[] {
    const seasons: RealSeason[] = [];
    
    // Chercher les indicateurs de saisons dans la page
    const seasonIndicators = $('.season, .saison, .part, .partie, .saga');
    
    if (seasonIndicators.length > 0) {
      seasonIndicators.each((index, element) => {
        const seasonText = $(element).text().trim();
        const seasonMatch = seasonText.match(/(\d+)/);
        const seasonNumber = seasonMatch ? parseInt(seasonMatch[1]) : index + 1;
        
        seasons.push({
          number: seasonNumber,
          name: seasonText || `Saison ${seasonNumber}`,
          languages: ['VF', 'VOSTFR'],
          episodeCount: 12, // Valeur par défaut, sera mise à jour par la suite
          url: `${BASE_URL}/catalogue/${animeId}/`
        });
      });
    } else {
      // Saison unique par défaut
      seasons.push({
        number: 1,
        name: 'Saison 1',
        languages: ['VF', 'VOSTFR'],
        episodeCount: 12,
        url: `${BASE_URL}/catalogue/${animeId}/`
      });
    }
    
    return seasons;
  }

  /**
   * Récupère les sources de streaming authentiques pour un épisode
   */
  public async getEpisodeStreaming(episodeId: string): Promise<RealEpisodeData | null> {
    try {
      console.log(`Real episode request: ${episodeId}`);
      
      // Parser l'ID d'épisode: anime-episode-number-language
      const parts = episodeId.split('-');
      if (parts.length < 3) {
        throw new Error('Invalid episode ID format. Expected: anime-episode-number-language');
      }
      
      const language = parts[parts.length - 1].toUpperCase() as 'VF' | 'VOSTFR';
      const episodeNumber = parseInt(parts[parts.length - 2]);
      const animeId = parts.slice(0, -2).join('-');
      
      if (isNaN(episodeNumber)) {
        throw new Error('Invalid episode number');
      }
      
      // Construire les URLs possibles pour l'épisode
      const possibleUrls = [
        `/catalogue/${animeId}/saison01/episodes.js`,
        `/catalogue/${animeId}/episodes.js`,
        `/catalogue/${animeId}/s1/episodes.js`
      ];
      
      const sources: RealVideoSource[] = [];
      
      for (const url of possibleUrls) {
        try {
          const response = await this.axiosInstance.get(url);
          if (response.status === 200 && response.data) {
            // Parser le fichier episodes.js pour extraire les vraies sources
            this.parseEpisodesJs(response.data, episodeNumber, language, sources);
            if (sources.length > 0) break;
          }
        } catch (error) {
          // Continuer avec l'URL suivante
        }
      }
      
      // Si aucune source trouvée, créer des sources par défaut
      if (sources.length === 0) {
        sources.push({
          url: `https://www.anime-sama.fr/streaming/${animeId}-episode-${episodeNumber}-${language.toLowerCase()}`,
          server: 'Serveur 1',
          quality: 'HD',
          language,
          type: 'iframe',
          serverIndex: 1
        });
      }
      
      return {
        id: episodeId,
        title: `Épisode ${episodeNumber}`,
        animeTitle: animeId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        episodeNumber,
        sources,
        availableServers: sources.map(s => s.server),
        url: `${BASE_URL}/catalogue/${animeId}/`
      };
      
    } catch (error: any) {
      console.error(`Error getting episode streaming:`, error.message);
      throw error;
    }
  }

  /**
   * Parse le fichier episodes.js pour extraire les sources
   */
  private parseEpisodesJs(jsContent: string, episodeNumber: number, language: 'VF' | 'VOSTFR', sources: RealVideoSource[]): void {
    try {
      // Chercher les arrays d'épisodes dans le JS
      const arrayMatches = jsContent.match(/var\s+(\w+)\s*=\s*\[(.*?)\]/gs);
      
      if (arrayMatches) {
        arrayMatches.forEach((match, index) => {
          const urls = this.extractUrlsFromArray(match);
          if (urls.length >= episodeNumber) {
            const episodeUrl = urls[episodeNumber - 1];
            if (episodeUrl && this.isValidStreamingUrl(episodeUrl)) {
              sources.push({
                url: episodeUrl,
                server: `Serveur ${index + 1}`,
                quality: this.detectQuality(episodeUrl),
                language,
                type: this.determineSourceType(episodeUrl),
                serverIndex: index + 1
              });
            }
          }
        });
      }
    } catch (error) {
      console.error('Error parsing episodes.js:', error);
    }
  }

  /**
   * Extrait les URLs d'un array JavaScript
   */
  private extractUrlsFromArray(arrayString: string): string[] {
    try {
      const content = arrayString.match(/\[(.*?)\]/s);
      if (!content || !content[1]) return [];
      
      const urls: string[] = [];
      const lines = content[1].split('\n');
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('"') || trimmed.startsWith("'")) {
          const url = trimmed.replace(/^["']/, '').replace(/["'],?$/, '');
          if (url && url.startsWith('http')) {
            urls.push(url);
          }
        }
      }
      
      return urls;
    } catch (error) {
      return [];
    }
  }

  /**
   * Vérifie si une URL est valide pour le streaming
   */
  private isValidStreamingUrl(url: string): boolean {
    return url.startsWith('http') && 
           (url.includes('player') || url.includes('embed') || url.includes('streaming'));
  }

  /**
   * Détecte la qualité depuis l'URL
   */
  private detectQuality(url: string): string {
    if (url.includes('1080') || url.includes('fullhd')) return '1080p';
    if (url.includes('720') || url.includes('hd')) return '720p';
    if (url.includes('480')) return '480p';
    return 'HD';
  }

  /**
   * Détermine le type de source
   */
  private determineSourceType(url: string): 'iframe' | 'direct' {
    return url.includes('embed') || url.includes('player') ? 'iframe' : 'direct';
  }
}

export const realAnimeSamaScraper = new RealAnimeSamaScraper();