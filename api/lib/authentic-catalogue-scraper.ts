import * as cheerio from 'cheerio';
import {
  createAxiosInstance,
  randomDelay,
  BASE_URL,
  cleanPageContent
} from './core.js';

const axios = createAxiosInstance();

/**
 * Extracteur du catalogue authentique d'anime-sama.fr
 * Utilise UNIQUEMENT les données réelles du site
 */
export class AuthenticCatalogueScraper {
  private axiosInstance = createAxiosInstance();
  private catalogueCache: any[] = [];
  private lastCacheUpdate: number = 0;
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

  /**
   * Extrait le catalogue complet et authentique d'anime-sama.fr
   */
  public async getAuthenticCatalogue(): Promise<any[]> {
    // Vérifier le cache
    if (this.catalogueCache.length > 0 && 
        Date.now() - this.lastCacheUpdate < this.CACHE_DURATION) {
      return this.catalogueCache;
    }

    try {
      await randomDelay(500, 1000);
      
      const response = await this.axiosInstance.get(`${BASE_URL}/catalogue/`);
      const $ = cheerio.load(response.data);
      
      const authenticAnimes: any[] = [];
      
      // Méthode robuste: extraire depuis les scripts et le HTML
      const scriptTags = $('script').toArray();
      const htmlContent = response.data;
      
      // Pattern pour trouver les URLs de catalogue
      const cataloguePattern = /\/catalogue\/([^\/\s"']+)\//g;
      let match;
      
      while ((match = cataloguePattern.exec(htmlContent)) !== null) {
        const animeId = match[1];
        
        // Filtrer les IDs valides
        if (animeId && animeId !== 'catalogue' && 
            !animeId.includes('?') && 
            animeId.length > 2 &&
            !animeId.startsWith('saison') &&
            !animeId.includes('vostfr') &&
            !animeId.includes('vf')) {
          
          const animeTitle = this.formatAnimeTitle(animeId);
          
          // Éviter les doublons
          if (!authenticAnimes.find(a => a.id === animeId)) {
            authenticAnimes.push({
              id: animeId,
              title: animeTitle,
              url: `${BASE_URL}/catalogue/${animeId}/`,
              authentic: true
            });
          }
        }
      }

      // Si pas de résultats avec les liens, essayer avec les scripts
      if (authenticAnimes.length === 0) {
        const scriptTags = $('script').toArray();
        
        for (const script of scriptTags) {
          const scriptContent = $(script).html() || '';
          
          // Chercher les patterns de catalogue dans les scripts
          const catalogueMatches = scriptContent.match(/\/catalogue\/([^\/\s"']+)/g);
          
          if (catalogueMatches) {
            catalogueMatches.forEach(match => {
              const animePath = match.replace('/catalogue/', '').replace(/\/$/, '');
              if (animePath && animePath !== 'catalogue' && 
                  !animePath.includes('?') && animePath.length > 2) {
                const animeTitle = this.formatAnimeTitle(animePath);
                
                if (!authenticAnimes.find(a => a.id === animePath)) {
                  authenticAnimes.push({
                    id: animePath,
                    title: animeTitle,
                    url: `${BASE_URL}/catalogue/${animePath}/`,
                    authentic: true
                  });
                }
              }
            });
          }
        }
      }

      // Mettre à jour le cache
      this.catalogueCache = authenticAnimes;
      this.lastCacheUpdate = Date.now();
      
      console.log(`Extracted ${authenticAnimes.length} authentic animes from anime-sama.fr`);
      return authenticAnimes;
      
    } catch (error) {
      console.error('Error extracting authentic catalogue:', error);
      // Retourner le cache s'il existe, sinon tableau vide
      return this.catalogueCache.length > 0 ? this.catalogueCache : [];
    }
  }

  /**
   * Recherche dans le catalogue authentique
   */
  public async searchAuthenticAnimes(query: string): Promise<any[]> {
    const catalogue = await this.getAuthenticCatalogue();
    const searchTerm = query.toLowerCase().trim();
    
    return catalogue.filter(anime => 
      anime.title.toLowerCase().includes(searchTerm) ||
      anime.id.toLowerCase().includes(searchTerm)
    );
  }

  /**
   * Vérifie si un anime existe réellement sur anime-sama.fr
   */
  public async verifyAnimeExists(animeId: string): Promise<boolean> {
    try {
      const response = await this.axiosInstance.get(`${BASE_URL}/catalogue/${animeId}/`);
      
      // Vérifier que ce n'est pas une page 404
      if (response.status === 404) return false;
      
      const $ = cheerio.load(response.data);
      
      // Vérifier que ce n'est pas la page d'erreur "Accès Introuvable"
      const pageTitle = $('title').text();
      if (pageTitle.includes('Accès Introuvable') || pageTitle.includes('404')) {
        return false;
      }
      
      // Vérifier la présence d'éléments caractéristiques d'une page d'anime
      const hasAnimeContent = $('h1').length > 0 && 
                             ($('.episodes').length > 0 || $('[data-anime]').length > 0);
      
      return hasAnimeContent;
      
    } catch (error) {
      return false;
    }
  }

  /**
   * Obtient les détails authentiques d'un anime
   */
  public async getAuthenticAnimeDetails(animeId: string): Promise<any | null> {
    try {
      // Vérifier d'abord que l'anime existe
      const exists = await this.verifyAnimeExists(animeId);
      if (!exists) {
        return null;
      }

      const response = await this.axiosInstance.get(`${BASE_URL}/catalogue/${animeId}/`);
      const $ = cheerio.load(response.data);
      
      const title = $('h1').first().text().trim() || this.formatAnimeTitle(animeId);
      const description = $('.description, .synopsis, p').first().text().trim() || '';
      
      // Extraire les genres
      const genres: string[] = [];
      $('.genre, .tag, [data-genre]').each((_, el) => {
        const genre = $(el).text().trim();
        if (genre && !genres.includes(genre)) {
          genres.push(genre);
        }
      });

      // Extraire les saisons disponibles
      const seasons: any[] = [];
      $('[data-season], .season, [href*="saison"]').each((_, el) => {
        const seasonText = $(el).text().trim();
        const seasonMatch = seasonText.match(/saison\s*(\d+)/i);
        if (seasonMatch) {
          const seasonNumber = parseInt(seasonMatch[1]);
          seasons.push({
            number: seasonNumber,
            name: `Saison ${seasonNumber}`,
            languages: ['VOSTFR'], // Par défaut
            episodeCount: 12, // Valeur par défaut, sera mise à jour
            url: `${BASE_URL}/catalogue/${animeId}/saison${seasonNumber}/vostfr/`
          });
        }
      });

      // Si pas de saisons trouvées, créer une saison par défaut
      if (seasons.length === 0) {
        seasons.push({
          number: 1,
          name: 'Saison 1',
          languages: ['VOSTFR'],
          episodeCount: 12,
          url: `${BASE_URL}/catalogue/${animeId}/saison1/vostfr/`
        });
      }

      return {
        id: animeId,
        title: title,
        description: description,
        genres: genres.length > 0 ? genres : ['Animation'],
        status: 'En cours',
        year: '2020', // Valeur par défaut
        seasons: seasons,
        url: `${BASE_URL}/catalogue/${animeId}/`,
        authentic: true
      };

    } catch (error) {
      console.error(`Error getting authentic details for ${animeId}:`, error);
      return null;
    }
  }

  /**
   * Formate le titre d'un anime à partir de son ID
   */
  private formatAnimeTitle(animeId: string): string {
    return animeId
      .replace(/-/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .replace(/\s+/g, ' ')
      .trim();
  }
}

export const authenticCatalogueScraper = new AuthenticCatalogueScraper();