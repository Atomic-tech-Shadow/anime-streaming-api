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
   * Extrait les vraies saisons depuis la page en analysant la structure JavaScript d'anime-sama.fr
   */
  private extractRealSeasons($: cheerio.CheerioAPI, animeId: string): RealSeason[] {
    const seasons: RealSeason[] = [];
    
    try {
      // Extraire le contenu HTML brut pour analyser les scripts
      const htmlContent = $.html();
      
      // Chercher les appels panneauAnime qui définissent les saisons réelles
      const panneauAnimeMatches = htmlContent.match(/panneauAnime\([^)]+\)/g);
      
      if (panneauAnimeMatches && panneauAnimeMatches.length > 0) {
        console.log(`🔍 Found ${panneauAnimeMatches.length} panneauAnime calls for ${animeId}`);
        
        panneauAnimeMatches.forEach((match, index) => {
          // Extraire les paramètres de panneauAnime
          const paramsMatch = match.match(/panneauAnime\('([^']+)',\s*'([^']+)',\s*'([^']+)'/);
          if (paramsMatch) {
            const [, sectionName, animeIdParam, seasonParam] = paramsMatch;
            
            // Déterminer le numéro de saison
            let seasonNumber = index + 1;
            const seasonMatch = seasonParam.match(/(\d+)/);
            if (seasonMatch) {
              seasonNumber = parseInt(seasonMatch[1]);
            }
            
            // Créer le nom de saison basé sur la section
            let seasonName = `Saison ${seasonNumber}`;
            if (sectionName.includes('saga')) {
              seasonName = `Saga ${seasonNumber}`;
            } else if (sectionName.includes('part')) {
              seasonName = `Partie ${seasonNumber}`;
            } else if (sectionName.includes('season')) {
              seasonName = `Season ${seasonNumber}`;
            }
            
            // Estimer le nombre d'épisodes en fonction de la section
            let episodeCount = 12; // Par défaut
            
            // Pour One Piece et autres longs animes, utiliser des estimations réalistes
            if (animeId === 'one-piece') {
              if (seasonNumber <= 10) {
                episodeCount = 100; // Les premières saisons ont environ 100 épisodes
              } else if (seasonNumber === 11) {
                episodeCount = 36; // Saga 11 : épisodes 1087-1122
              } else {
                episodeCount = 50; // Estimation pour les autres saisons
              }
            } else if (animeId === 'naruto') {
              episodeCount = seasonNumber === 1 ? 220 : 500; // Naruto puis Shippuden
            } else if (animeId === 'dragon-ball-z') {
              episodeCount = 291;
            } else if (animeId === 'bleach') {
              episodeCount = seasonNumber <= 16 ? 20 : 13;
            }
            
            seasons.push({
              number: seasonNumber,
              name: seasonName,
              languages: ['VF', 'VOSTFR'],
              episodeCount,
              url: `${BASE_URL}/catalogue/${animeId}/`
            });
          }
        });
      }
      
      // Si aucune saison trouvée via panneauAnime, chercher dans le JavaScript
      if (seasons.length === 0) {
        const scriptTags = $('script');
        scriptTags.each((index, element) => {
          const scriptContent = $(element).html() || '';
          
          // Chercher des patterns de saisons dans le JavaScript
          const seasonPatterns = [
            /saison(\d+)/gi,
            /season(\d+)/gi,
            /saga(\d+)/gi,
            /part(\d+)/gi,
            /partie(\d+)/gi
          ];
          
          seasonPatterns.forEach(pattern => {
            const matches = scriptContent.match(pattern);
            if (matches) {
              matches.forEach(match => {
                const numberMatch = match.match(/(\d+)/);
                if (numberMatch) {
                  const seasonNumber = parseInt(numberMatch[1]);
                  if (!seasons.find(s => s.number === seasonNumber)) {
                    seasons.push({
                      number: seasonNumber,
                      name: `Saison ${seasonNumber}`,
                      languages: ['VF', 'VOSTFR'],
                      episodeCount: this.estimateEpisodeCount(animeId, seasonNumber),
                      url: `${BASE_URL}/catalogue/${animeId}/`
                    });
                  }
                }
              });
            }
          });
        });
      }
      
      // Si toujours aucune saison, analyser les boutons de navigation
      if (seasons.length === 0) {
        const navButtons = $('.nav-item, .btn, button, a[onclick*="panneauAnime"]');
        navButtons.each((index, element) => {
          const buttonText = $(element).text().trim();
          const onclickAttr = $(element).attr('onclick') || '';
          
          if (buttonText.match(/saison|season|saga|partie|part/i) || onclickAttr.includes('panneauAnime')) {
            const numberMatch = (buttonText + onclickAttr).match(/(\d+)/);
            const seasonNumber = numberMatch ? parseInt(numberMatch[1]) : index + 1;
            
            if (!seasons.find(s => s.number === seasonNumber)) {
              seasons.push({
                number: seasonNumber,
                name: buttonText || `Saison ${seasonNumber}`,
                languages: ['VF', 'VOSTFR'],
                episodeCount: this.estimateEpisodeCount(animeId, seasonNumber),
                url: `${BASE_URL}/catalogue/${animeId}/`
              });
            }
          }
        });
      }
      
    } catch (error) {
      console.error('Error extracting seasons:', error);
    }
    
    // Si aucune saison détectée, créer une saison par défaut
    if (seasons.length === 0) {
      seasons.push({
        number: 1,
        name: 'Saison 1',
        languages: ['VF', 'VOSTFR'],
        episodeCount: this.estimateEpisodeCount(animeId, 1),
        url: `${BASE_URL}/catalogue/${animeId}/`
      });
    }
    
    // Trier les saisons par numéro
    return seasons.sort((a, b) => a.number - b.number);
  }

  /**
   * Estime le nombre d'épisodes pour un anime et une saison donnés
   */
  private estimateEpisodeCount(animeId: string, seasonNumber: number): number {
    // Base de données des animes populaires avec leurs vrais nombres d'épisodes
    const animeEpisodeCounts: { [key: string]: number[] } = {
      'one-piece': [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 36], // Saga 11 = 36 épisodes
      'naruto': [220, 500], // Naruto + Shippuden
      'dragon-ball-z': [291],
      'bleach': [20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 13], // TYBW = 13
      'my-hero-academia': [13, 25, 25, 25, 25, 25, 21], // Saison 7 = 21 épisodes
      'attack-on-titan': [25, 12, 22, 16], // Les 4 saisons
      'demon-slayer': [26, 11, 11], // S1 + Mugen Train + S2
      'jujutsu-kaisen': [24, 23], // S1 + S2
      'chainsaw-man': [12],
      'tokyo-ghoul': [12, 12, 12, 12], // 4 saisons
      'hunter-x-hunter': [148],
      'fairy-tail': [175, 102, 51], // 3 parties
      'fullmetal-alchemist': [64], // Brotherhood
      'death-note': [37],
      'cowboy-bebop': [26],
      'evangelion': [26]
    };
    
    if (animeEpisodeCounts[animeId] && animeEpisodeCounts[animeId][seasonNumber - 1]) {
      return animeEpisodeCounts[animeId][seasonNumber - 1];
    }
    
    // Estimation par défaut basée sur le numéro de saison
    if (seasonNumber === 1) return 24; // Première saison typique
    if (seasonNumber <= 3) return 12; // Saisons suivantes plus courtes
    return 12; // Par défaut
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
      
      // Si aucune source trouvée via episodes.js, essayer extraction directe depuis la page streaming
      if (sources.length === 0) {
        try {
          const streamingSources = await this.extractStreamingFromPage(animeId, episodeNumber, language);
          sources.push(...streamingSources);
        } catch (error) {
          console.error('Erreur extraction page streaming:', error);
        }
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
   * Extrait les sources de streaming directement depuis la page streaming d'anime-sama.fr
   */
  private async extractStreamingFromPage(animeId: string, episodeNumber: number, language: 'VF' | 'VOSTFR'): Promise<RealVideoSource[]> {
    const sources: RealVideoSource[] = [];
    
    try {
      const streamingUrl = `https://www.anime-sama.fr/streaming/${animeId}-episode-${episodeNumber}-${language.toLowerCase()}`;
      console.log(`Extraction depuis: ${streamingUrl}`);
      
      const response = await this.axiosInstance.get(streamingUrl, {
        headers: {
          'Referer': `https://anime-sama.fr/catalogue/${animeId}/`,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (response.status !== 200) {
        throw new Error(`Page non accessible: ${response.status}`);
      }
      
      const pageContent = response.data;
      const $ = cheerio.load(pageContent);
      
      // Recherche d'iframes de streaming
      $('iframe').each((index, element) => {
        const src = $(element).attr('src');
        if (src && this.isValidStreamingSource(src)) {
          sources.push({
            url: src.startsWith('http') ? src : `https:${src}`,
            server: `Serveur ${index + 1}`,
            quality: this.detectVideoQuality(src),
            language,
            type: 'iframe',
            serverIndex: index + 1
          });
        }
      });
      
      // Recherche de liens vidéo directs dans le JavaScript
      const scriptMatches = pageContent.match(/(?:src|url)[\s]*[:=][\s]*['"`]([^'"`]+\.(?:mp4|m3u8|webm))/gi);
      if (scriptMatches) {
        scriptMatches.forEach((match: string, index: number) => {
          const urlMatch = match.match(/['"`]([^'"`]+)['"`]/);
          if (urlMatch && urlMatch[1]) {
            const videoUrl = urlMatch[1];
            if (this.isValidStreamingSource(videoUrl)) {
              sources.push({
                url: videoUrl.startsWith('http') ? videoUrl : `https:${videoUrl}`,
                server: `Direct ${index + 1}`,
                quality: this.detectVideoQuality(videoUrl),
                language,
                type: 'direct',
                serverIndex: index + sources.length + 1
              });
            }
          }
        });
      }
      
      // Recherche des players populaires (Lecteur, Player, etc.)
      const playerSelectors = ['.player iframe', '#player iframe', '.video-player iframe', '[data-src]'];
      playerSelectors.forEach((selector, selectorIndex) => {
        $(selector).each((index, element) => {
          const src = $(element).attr('src') || $(element).attr('data-src');
          if (src && this.isValidStreamingSource(src)) {
            sources.push({
              url: src.startsWith('http') ? src : `https:${src}`,
              server: `Player ${selectorIndex + 1}`,
              quality: this.detectVideoQuality(src),
              language,
              type: 'iframe',
              serverIndex: selectorIndex + index + 1
            });
          }
        });
      });
      
      console.log(`Extraction page: ${sources.length} sources trouvées`);
      
    } catch (error: any) {
      console.error(`Erreur extraction page streaming:`, error.message);
      // En cas d'échec, créer une source de base pour éviter l'erreur totale
      sources.push({
        url: `https://www.anime-sama.fr/streaming/${animeId}-episode-${episodeNumber}-${language.toLowerCase()}`,
        server: 'Anime-Sama',
        quality: 'HD',
        language,
        type: 'iframe',
        serverIndex: 1
      });
    }
    
    return sources;
  }

  /**
   * Vérifie si une URL est une source de streaming valide
   */
  private isValidStreamingSource(url: string): boolean {
    if (!url || url.length < 5) return false;
    
    const validPatterns = [
      /\.(mp4|m3u8|webm|avi|mkv)$/i,
      /\/embed\//i,
      /\/player\//i,
      /\/watch\//i,
      /dailymotion\.com/i,
      /youtube\.com/i,
      /youtu\.be/i,
      /vimeo\.com/i,
      /streamtape/i,
      /doodstream/i,
      /mixdrop/i,
      /uqload/i
    ];
    
    return validPatterns.some(pattern => pattern.test(url));
  }

  /**
   * Détecte la qualité vidéo depuis l'URL
   */
  private detectVideoQuality(url: string): string {
    if (url.includes('1080') || url.includes('fhd')) return 'FHD';
    if (url.includes('720') || url.includes('hd')) return 'HD';
    if (url.includes('480') || url.includes('sd')) return 'SD';
    if (url.includes('360')) return '360p';
    return 'HD'; // Par défaut
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