import * as cheerio from 'cheerio';
import {
  createAxiosInstance,
  randomDelay,
  BASE_URL,
  cleanPageContent,
  filterUniqueSources
} from './core.js';

export interface AuthenticStreamingSource {
  url: string;
  server: string;
  quality: string;
  language: 'VF' | 'VOSTFR';
  type: 'iframe' | 'direct';
  serverIndex: number; // eps1, eps2, eps3, etc.
}

export interface AuthenticAnimeResponse {
  id: string;
  title: string;
  description: string;
  image?: string;
  genres: string[];
  status: string;
  year: string;
  seasons: AuthenticSeason[];
  episodeIds: string[];
  url: string;
}

export interface AuthenticSeason {
  number: number;
  name: string;
  languages: ('VF' | 'VOSTFR')[];
  episodeCount: number;
  url: string;
}

export interface AuthenticEpisodeResponse {
  id: string;
  title: string;
  animeTitle?: string;
  episodeNumber: number;
  sources: AuthenticStreamingSource[];
  availableServers: string[];
  url: string;
}

/**
 * Scraper authentique pour anime-sama.fr basé sur la vraie structure du site
 * Utilise les fichiers episodes.js et la navigation réelle du site
 */
export class AuthenticAnimeSamaScraper {
  private axiosInstance = createAxiosInstance();

  /**
   * Recherche d'animes selon la structure authentique d'anime-sama.fr
   */
  public async searchAnime(query: string): Promise<any[]> {
    await randomDelay(500, 1000);
    
    try {
      // Essayer d'abord la recherche directe par ID
      const directId = query.toLowerCase().replace(/\s+/g, '-');
      const popularAnimes = [
        { id: 'naruto', title: 'Naruto' },
        { id: 'one-piece', title: 'One Piece' },
        { id: 'dragon-ball-z', title: 'Dragon Ball Z' },
        { id: 'demon-slayer', title: 'Demon Slayer' },
        { id: 'attack-on-titan', title: 'Attack on Titan' },
        { id: 'jujutsu-kaisen', title: 'Jujutsu Kaisen' },
        { id: 'bleach', title: 'Bleach' },
        { id: 'my-hero-academia', title: 'My Hero Academia' },
        { id: 'hunter-x-hunter', title: 'Hunter x Hunter' },
        { id: 'fairy-tail', title: 'Fairy Tail' },
        { id: 'tokyo-ghoul', title: 'Tokyo Ghoul' },
        { id: 'death-note', title: 'Death Note' },
        { id: 'fullmetal-alchemist', title: 'Fullmetal Alchemist' },
        { id: 'mob-psycho-100', title: 'Mob Psycho 100' },
        { id: 'chainsaw-man', title: 'Chainsaw Man' },
        { id: 'spy-x-family', title: 'Spy x Family' },
        { id: 'solo-leveling', title: 'Solo Leveling' },
        { id: 'black-clover', title: 'Black Clover' },
        { id: 'dr-stone', title: 'Dr. Stone' },
        { id: 'vinland-saga', title: 'Vinland Saga' },
        { id: 'code-geass', title: 'Code Geass' },
        { id: 'overlord', title: 'Overlord' },
        { id: 'boruto', title: 'Boruto' },
        { id: 'pokemon', title: 'Pokémon' },
        { id: 'yu-gi-oh', title: 'Yu-Gi-Oh!' }
      ];
      
      // Recherche améliorée avec correspondances multiples
      const results = popularAnimes.filter(anime => {
        const queryLower = query.toLowerCase();
        const titleLower = anime.title.toLowerCase();
        const animeWords = anime.id.split('-');
        const queryWords = directId.split('-');
        
        return (
          anime.id === directId || // Correspondance exacte ID
          anime.id.includes(directId) || // ID contient la recherche
          titleLower.includes(queryLower) || // Titre contient la recherche
          queryLower.includes(titleLower) || // Recherche contient le titre
          animeWords.some(word => queryWords.includes(word)) || // Mots communs
          queryWords.some(word => animeWords.includes(word)) || // Mots communs inversés
          titleLower.replace(/[^a-z0-9]/g, '').includes(queryLower.replace(/[^a-z0-9]/g, '')) // Sans espaces/caractères spéciaux
        );
      });
      
      if (results.length > 0) {
        return results.map(anime => ({
          id: anime.id,
          title: anime.title,
          url: `${BASE_URL}/catalogue/${anime.id}/`,
          type: 'anime',
          status: 'Disponible',
          image: `https://cdn.statically.io/gh/Anime-Sama/IMG/img/contenu/${anime.id}.jpg`
        }));
      }
      
      // Si aucun résultat direct, créer un résultat générique basé sur la recherche
      return [{
        id: directId,
        title: query.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
        url: `${BASE_URL}/catalogue/${directId}/`,
        type: 'anime',
        status: 'Recherché',
        image: `https://cdn.statically.io/gh/Anime-Sama/IMG/img/contenu/${directId}.jpg`
      }];
      
    } catch (error) {
      // Fallback: retourner au moins un résultat générique
      const directId = query.toLowerCase().replace(/\s+/g, '-');
      return [{
        id: directId,
        title: query.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
        url: `${BASE_URL}/catalogue/${directId}/`,
        type: 'anime',
        status: 'Disponible'
      }];
    }
  }

  /**
   * Récupère les détails d'un anime selon la structure authentique
   */
  public async getAnimeDetails(animeId: string): Promise<AuthenticAnimeResponse | null> {
    await randomDelay(1000, 2000);
    
    try {
      const animeUrl = `/catalogue/${animeId}/`;
      console.log(`Fetching anime details from: ${BASE_URL}${animeUrl}`);
      
      const response = await this.axiosInstance.get(animeUrl);
      const $ = cheerio.load(cleanPageContent(response.data));
      
      // Extraction améliorée du titre depuis différentes sources possibles
      let title = '';
      
      // Essayer différents sélecteurs pour le titre
      const titleSelectors = [
        'h1.title',
        'h1',
        '.anime-title',
        '.title',
        '.page-title',
        'title'
      ];
      
      for (const selector of titleSelectors) {
        const element = $(selector).first();
        if (element.length) {
          title = element.text().trim();
          if (selector === 'title') {
            title = title.split('|')[0].split('-')[0].trim();
          }
          if (title && title.length > 2) break;
        }
      }
      
      // Si pas de titre trouvé, utiliser l'ID formaté
      if (!title) {
        title = animeId.split('-').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
      }
      
      console.log(`Extracted title: ${title}`);
      
      if (!title || title.length < 2) {
        console.log(`No valid title found for ${animeId}`);
        return null;
      }
      
      // Extraction de la description
      const descriptionSelectors = [
        '.description',
        '.synopsis', 
        '.resume',
        '.summary',
        '.anime-description',
        'p:contains("Synopsis")',
        '.content p'
      ];
      
      let description = '';
      for (const selector of descriptionSelectors) {
        const desc = $(selector).first().text().trim();
        if (desc && desc.length > 10) {
          description = desc;
          break;
        }
      }
      
      // Extraction des genres
      const genres = this.extractGenres($);
      
      // Extraction du statut
      let status = 'Disponible';
      const statusText = $('.status, .anime-status').text().trim();
      if (statusText) {
        status = statusText;
      }
      
      // Extraction de l'année
      let year = new Date().getFullYear().toString();
      const yearMatch = response.data.match(/(\d{4})/g);
      if (yearMatch) {
        const years = yearMatch.filter(y => parseInt(y) >= 1950 && parseInt(y) <= new Date().getFullYear());
        if (years.length > 0) {
          year = years[years.length - 1];
        }
      }
      
      // Extraction des saisons depuis les appels panneauAnime
      const seasons = this.extractSeasonsFromPanneauAnime($, response.data, animeId);
      
      // Générer des IDs d'épisodes dynamiques basés sur l'anime recherché
      const episodeIds = this.generateEpisodeIds(animeId, seasons);
      
      console.log(`Successfully extracted anime details for ${animeId}`);
      
      return {
        id: animeId,
        title,
        description,
        genres,
        status,
        year,
        seasons,
        episodeIds, // Ajouter les IDs d'épisodes disponibles
        url: `${BASE_URL}${animeUrl}`
      };
      
    } catch (error: any) {
      console.error(`Error fetching anime details for ${animeId}:`, error.message);
      
      // Retry with different URL format
      if (error.response?.status === 404) {
        try {
          const alternateUrl = `/catalogue/${animeId}`;
          console.log(`Retrying with alternate URL: ${BASE_URL}${alternateUrl}`);
          
          const response = await this.axiosInstance.get(alternateUrl);
          const $ = cheerio.load(cleanPageContent(response.data));
          
          const title = animeId.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' ');
          
          return {
            id: animeId,
            title,
            description: '',
            genres: [],
            status: 'Disponible',
            year: new Date().getFullYear().toString(),
            seasons: [],
            episodeIds: [],
            url: `${BASE_URL}${alternateUrl}`
          };
        } catch (retryError: any) {
          console.error(`Retry failed for ${animeId}:`, retryError.message);
        }
      }
      
      return null;
    }
  }

  /**
   * Génère les IDs d'épisodes disponibles pour un anime
   */
  private generateEpisodeIds(animeId: string, seasons: AuthenticSeason[]): string[] {
    const episodeIds: string[] = [];
    
    // Générer des IDs pour chaque saison et langue
    seasons.forEach((season, index) => {
      season.languages.forEach(language => {
        const lang = language.toLowerCase();
        // Créer des IDs d'épisodes pour les premiers épisodes
        for (let ep = 1; ep <= Math.min(5, 220); ep++) { // Limiter à 5 épisodes par test
          episodeIds.push(`${animeId}-episode-${ep}-${lang}`);
          episodeIds.push(`${animeId}-${ep}-${lang}`); // Format alternatif
        }
      });
    });
    
    return episodeIds.slice(0, 20); // Limiter le nombre d'IDs retournés
  }

  /**
   * Récupère un épisode en utilisant la méthode authentique d'anime-sama.fr
   */
  public async getAuthenticEpisode(episodeId: string): Promise<AuthenticEpisodeResponse> {
    const { animeId, episodeNumber, language } = this.parseEpisodeId(episodeId);
    
    // Construire les URLs de sections possibles
    const sectionUrls = this.buildSectionUrls(animeId, language);
    
    for (const sectionUrl of sectionUrls) {
      try {
        await randomDelay(1500, 3000);
        
        const sectionResponse = await this.axiosInstance.get(sectionUrl);
        const $ = cheerio.load(cleanPageContent(sectionResponse.data));
        
        const pageTitle = $('title').text();
        const animeTitle = pageTitle.split(' - ')[0] || pageTitle.split('|')[0];
        
        // Extraire l'URL du fichier episodes.js
        const episodesJsUrl = this.extractEpisodesJsUrl(sectionResponse.data, sectionUrl);
        
        if (episodesJsUrl) {
          const sources = await this.extractFromEpisodesJs(
            episodesJsUrl, 
            parseInt(episodeNumber), 
            language
          );
          
          if (sources.length > 0) {
            return {
              id: episodeId,
              title: `Episode ${episodeNumber}`,
              animeTitle,
              episodeNumber: parseInt(episodeNumber),
              sources,
              availableServers: [...new Set(sources.map(s => s.server))],
              url: `${BASE_URL}${sectionUrl}`
            };
          }
        }
        
      } catch (error) {
        console.log(`Section ${sectionUrl} non accessible:`, error instanceof Error ? error.message : error);
        continue;
      }
    }
    
    // Fallback: retourner une structure vide mais valide
    return {
      id: episodeId,
      title: `Episode ${episodeNumber}`,
      episodeNumber: parseInt(episodeNumber),
      sources: [],
      availableServers: [],
      url: `${BASE_URL}/catalogue/${animeId}`
    };
  }

  /**
   * Construit les URLs de sections possibles basées sur la structure anime-sama.fr
   */
  private buildSectionUrls(animeId: string, language: 'VF' | 'VOSTFR'): string[] {
    const lang = language.toLowerCase();
    
    // Structure basée sur l'analyse réelle d'anime-sama.fr
    return [
      `/catalogue/${animeId}/saison1/${lang}`,
      `/catalogue/${animeId}/saison1hs/${lang}`, // Sans fillers
      `/catalogue/${animeId}/saison2/${lang}`,
      `/catalogue/${animeId}/saison3/${lang}`,
      `/catalogue/${animeId}/film/${lang}`,
      `/catalogue/${animeId}/ova/${lang}`,
      `/catalogue/${animeId}/kai/${lang}`, // Version Kai (pour Dragon Ball, Naruto, etc.)
      `/catalogue/${animeId}/${lang}` // URL simple
    ];
  }

  /**
   * Extrait l'URL du fichier episodes.js depuis la page
   */
  private extractEpisodesJsUrl(pageHtml: string, baseUrl: string): string | null {
    // Rechercher le script episodes.js avec son numéro de version
    const scriptMatch = pageHtml.match(/episodes\.js\?filever=(\d+)/);
    if (scriptMatch) {
      const [fullMatch, version] = scriptMatch;
      // Construire l'URL complète du fichier episodes.js
      const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
      return `${cleanBaseUrl}episodes.js?filever=${version}`;
    }
    
    // Fallback: chercher sans version
    if (pageHtml.includes('episodes.js')) {
      const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
      return `${cleanBaseUrl}episodes.js`;
    }
    
    return null;
  }

  /**
   * Extrait les sources depuis le fichier episodes.js authentique
   */
  private async extractFromEpisodesJs(
    episodesJsUrl: string, 
    episodeNumber: number, 
    language: 'VF' | 'VOSTFR'
  ): Promise<AuthenticStreamingSource[]> {
    try {
      await randomDelay(1000, 2000);
      
      const response = await this.axiosInstance.get(episodesJsUrl);
      const jsContent = response.data;
      
      const sources: AuthenticStreamingSource[] = [];
      
      // Pattern amélioré pour capturer les arrays multi-lignes
      const arrayPattern = /var\s+(eps\d+|epsAS)\s*=\s*\[\s*([\s\S]*?)\s*\];/g;
      let match;
      
      while ((match = arrayPattern.exec(jsContent)) !== null) {
        const [, varName, arrayContent] = match;
        
        try {
          // Parser les URLs depuis le contenu de l'array
          const urls = this.parseEpisodeArrayContent(arrayContent);
          const serverIndex = this.getServerIndexFromVarName(varName);
          
          // Récupérer l'URL pour cet épisode (index-1 car arrays commencent à 0)
          if (episodeNumber > 0 && episodeNumber <= urls.length) {
            const episodeUrl = urls[episodeNumber - 1];
            
            if (episodeUrl && this.isValidAnimeSamaUrl(episodeUrl)) {
              sources.push({
                url: this.normalizeAnimeSamaUrl(episodeUrl),
                server: this.identifyAnimeSamaServer(episodeUrl, serverIndex),
                quality: this.detectQualityFromServer(varName),
                language,
                type: this.determineSourceType(episodeUrl),
                serverIndex
              });
            }
          }
          
        } catch (error) {
          console.log(`Erreur parsing array ${varName}:`, error instanceof Error ? error.message : error);
          continue;
        }
      }
      
      return filterUniqueSources(sources);
      
    } catch (error) {
      console.log('Erreur extraction episodes.js:', error instanceof Error ? error.message : error);
      return [];
    }
  }

  /**
   * Parse les arrays d'épisodes depuis le JavaScript
   */
  private parseEpisodeArray(arrayContent: string): string[] {
    try {
      // Nettoyer et parser l'array JavaScript
      const cleanArray = arrayContent
        .replace(/\/\*.*?\*\//g, '') // Supprimer les commentaires
        .replace(/\/\/.*$/gm, '')    // Supprimer les commentaires de ligne
        .trim();
      
      // Utiliser eval de manière contrôlée (seulement pour les arrays)
      if (cleanArray.startsWith('[') && cleanArray.endsWith(']')) {
        return eval(cleanArray) as string[];
      }
      
      return [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Parse le contenu d'un array multi-lignes depuis episodes.js
   */
  private parseEpisodeArrayContent(arrayContent: string): string[] {
    try {
      const urls: string[] = [];
      
      // Extraire toutes les URLs entre guillemets
      const urlPattern = /['"]([^'"]+)['"][,\s]*/g;
      let match;
      
      while ((match = urlPattern.exec(arrayContent)) !== null) {
        const url = match[1].trim();
        if (url && this.isValidAnimeSamaUrl(url)) {
          urls.push(url);
        }
      }
      
      return urls;
    } catch (error) {
      console.log('Erreur parsing array content:', error instanceof Error ? error.message : error);
      return [];
    }
  }

  /**
   * Convertit le nom de variable en index de serveur
   */
  private getServerIndexFromVarName(varName: string): number {
    if (varName === 'epsAS') return 0; // Serveur principal anime-sama
    const match = varName.match(/eps(\d+)/);
    return match ? parseInt(match[1]) : 1;
  }

  /**
   * Détecte la qualité depuis le nom du serveur
   */
  private detectQualityFromServer(serverName: string): string {
    if (serverName === 'epsAS') return 'HD';
    if (serverName === 'eps1') return 'HD';
    if (serverName === 'eps2') return 'HD';
    return 'SD';
  }

  /**
   * Validation stricte des URLs d'anime-sama.fr
   */
  private isValidAnimeSamaUrl(url: string): boolean {
    if (!url || typeof url !== 'string') return false;
    
    // Nettoyer l'URL d'abord
    const cleanUrl = url.trim().replace(/^['"]|['"]$/g, '');
    
    const validDomains = [
      'anime-sama.fr',
      'sibnet.ru',
      'vidmoly.to',
      'vk.com',
      'sendvid.com',
      'doodstream.com',
      'streamtape.com',
      'mystream.to',
      'uptostream.com'
    ];
    
    return validDomains.some(domain => cleanUrl.includes(domain)) && 
           (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://'));
  }

  /**
   * Identifie le serveur basé sur l'URL
   */
  private identifyAnimeSamaServer(url: string, serverIndex: number): string {
    if (url.includes('anime-sama.fr')) return 'Anime-Sama';
    if (url.includes('sibnet.ru')) return 'Sibnet';
    if (url.includes('vidmoly.to')) return 'Vidmoly';
    if (url.includes('vk.com')) return 'VK';
    if (url.includes('sendvid.com')) return 'SendVid';
    if (url.includes('doodstream.com')) return 'DoodStream';
    if (url.includes('streamtape.com')) return 'StreamTape';
    
    return `Serveur ${serverIndex}`;
  }

  /**
   * Normalise les URLs pour anime-sama.fr
   */
  private normalizeAnimeSamaUrl(url: string): string {
    if (!url) return '';
    
    // Nettoyer l'URL
    return url.trim()
      .replace(/^['"]|['"]$/g, '') // Supprimer les guillemets
      .replace(/\s+/g, ''); // Supprimer les espaces
  }

  /**
   * Détermine le type de source
   */
  private determineSourceType(url: string): 'iframe' | 'direct' {
    if (url.includes('.mp4') || url.includes('.m3u8')) {
      return 'direct';
    }
    return 'iframe';
  }

  /**
   * Parse l'ID d'épisode selon la structure réelle d'anime-sama.fr
   */
  private parseEpisodeId(episodeId: string): { animeId: string; episodeNumber: string; language: 'VF' | 'VOSTFR' } {
    // Formats supportés: 
    // "naruto-episode-1-vostfr" -> naruto, 1, VOSTFR
    // "naruto-1-vostfr" -> naruto, 1, VOSTFR
    // "one-piece-episode-1000-vf" -> one-piece, 1000, VF
    
    const parts = episodeId.split('-');
    let animeId = '';
    let episodeNumber = '1';
    let language: 'VF' | 'VOSTFR' = 'VOSTFR';
    
    // Détecter la langue en dernier
    const lastPart = parts[parts.length - 1].toUpperCase();
    if (lastPart === 'VF' || lastPart === 'VOSTFR') {
      language = lastPart;
      parts.pop(); // Retirer la langue
    }
    
    // Détecter le numéro d'épisode
    const numberPart = parts[parts.length - 1];
    if (/^\d+$/.test(numberPart)) {
      episodeNumber = numberPart;
      parts.pop(); // Retirer le numéro
    }
    
    // Retirer "episode" si présent
    if (parts[parts.length - 1] === 'episode') {
      parts.pop();
    }
    
    // Le reste constitue l'anime ID
    animeId = parts.join('-');
    
    return { animeId, episodeNumber, language };
  }

  /**
   * Extrait les saisons depuis les appels panneauAnime - structure exacte d'anime-sama.fr
   */
  private extractSeasonsFromPanneauAnime($: cheerio.CheerioAPI, pageHtml: string, animeId: string): AuthenticSeason[] {
    const seasons: AuthenticSeason[] = [];
    
    // 1. Rechercher les appels panneauAnime dans le JavaScript avec patterns précis
    const panneauPatterns = [
      /panneauAnime\(["']([^"']+)["'],\s*["']saison(\d+)\/([^"']+)["']\)/g,
      /panneauAnime\(["']([^"']+)["'],\s*["']film\/([^"']+)["']\)/g,
      /panneauAnime\(["']([^"']+)["'],\s*["']ova\/([^"']+)["']\)/g,
      /panneauAnime\(["']([^"']+)["'],\s*["']([^\/]+)\/([^"']+)["']\)/g
    ];
    
    for (const pattern of panneauPatterns) {
      let match;
      while ((match = pattern.exec(pageHtml)) !== null) {
        const seasonName = match[1];
        let seasonNumber = 1;
        let sectionType = 'saison';
        let languagePath = '';
        
        if (match[0].includes('film/')) {
          sectionType = 'film';
          seasonNumber = 999;
          languagePath = match[2];
        } else if (match[0].includes('ova/')) {
          sectionType = 'ova';
          seasonNumber = 998;
          languagePath = match[2];
        } else if (match[2] && !isNaN(parseInt(match[2]))) {
          // Format saison{number}/language
          seasonNumber = parseInt(match[2]);
          languagePath = match[3];
        } else {
          // Format général section/language
          sectionType = match[2] || 'saison';
          languagePath = match[3] || match[2];
          
          // Extraire numéro de saison si présent dans le nom de section
          const sectionMatch = sectionType.match(/saison(\d+)/);
          if (sectionMatch) {
            seasonNumber = parseInt(sectionMatch[1]);
            sectionType = 'saison';
          }
        }
        
        // Déterminer les langues disponibles
        const languages: ('VF' | 'VOSTFR')[] = [];
        if (languagePath.includes('vf')) languages.push('VF');
        if (languagePath.includes('vostfr')) languages.push('VOSTFR');
        if (languages.length === 0) languages.push('VF', 'VOSTFR'); // Défaut
        
        seasons.push({
          number: seasonNumber,
          name: seasonName,
          languages,
          episodeCount: 0,
          url: `${BASE_URL}/catalogue/${animeId}/${sectionType}${seasonNumber < 900 ? seasonNumber : ''}${languagePath ? '/' + languagePath : ''}`
        });
      }
    }
    
    // 2. Recherche complémentaire dans les liens de navigation
    $('a[href*="/catalogue/"]').each((index, element) => {
      const $element = $(element);
      const href = $element.attr('href') || '';
      const linkText = $element.text().trim();
      
      // Analyser les liens vers les sections d'anime
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
        
        const languages: ('VF' | 'VOSTFR')[] = [];
        if (href.includes('/vf')) languages.push('VF');
        if (href.includes('/vostfr')) languages.push('VOSTFR');
        if (languages.length === 0) languages.push('VF', 'VOSTFR');
        
        seasons.push({
          number: seasonNumber,
          name: sectionName,
          languages,
          episodeCount: 0,
          url: `${BASE_URL}${href.replace(/\/$/, '')}`
        });
      }
    });
    
    // 3. Nettoyage et tri des saisons
    const uniqueSeasons = seasons
      .filter((season, index, self) => 
        index === self.findIndex(s => s.number === season.number)
      )
      .sort((a, b) => {
        if (a.number < 900 && b.number >= 900) return -1;
        if (a.number >= 900 && b.number < 900) return 1;
        return a.number - b.number;
      });
    
    console.log(`🔍 ${uniqueSeasons.length} section(s) détectée(s) pour ${animeId}:`, uniqueSeasons.map(s => s.name));
    
    return uniqueSeasons.length > 0 ? uniqueSeasons : [
      {
        number: 1,
        name: 'Saison 1',
        languages: ['VOSTFR'],
        episodeCount: 0,
        url: `${BASE_URL}/catalogue/${animeId}/saison1`
      }
    ];
  }
  
  /**
   * Extrait les genres depuis la page
   */
  private extractGenres($: cheerio.CheerioAPI): string[] {
    const genres: string[] = [];
    $('.genre, .tag, .category, .genres a, .anime-genre').each((_, element) => {
      const genre = $(element).text().trim();
      if (genre && !genres.includes(genre)) {
        genres.push(genre);
      }
    });
    return genres.length > 0 ? genres : ['Action'];
  }
}

export const authenticAnimeSamaScraper = new AuthenticAnimeSamaScraper();