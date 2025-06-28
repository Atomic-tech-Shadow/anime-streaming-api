import axios from 'axios';
import * as cheerio from 'cheerio';
import { createAxiosInstance } from './core';

export interface DeepScrapingResult {
  animes: Map<string, AnimeComplete>;
  totalAnimes: number;
  totalEpisodes: number;
  totalFilms: number;
  totalOAV: number;
  totalScans: number;
  genres: Set<string>;
  years: Set<string>;
  languages: Set<string>;
}

export interface AnimeComplete {
  id: string;
  title: string;
  url: string;
  image?: string;
  description?: string;
  status?: string;
  year?: string;
  genres: string[];
  seasons: SeasonInfo[];
  films: ContentItem[];
  oav: ContentItem[];
  scans: ContentItem[];
  specials: ContentItem[];
  totalContent: number;
}

export interface SeasonInfo {
  number: number;
  name: string;
  episodes: EpisodeInfo[];
  languages: string[];
}

export interface EpisodeInfo {
  number: number;
  title: string;
  url: string;
  languages: string[];
}

export interface ContentItem {
  id: string;
  title: string;
  url: string;
  type: string;
  languages: string[];
}

export class AnimeSamaDeepScraper {
  private axiosInstance = createAxiosInstance();
  private baseUrl = 'https://anime-sama.fr';
  private results: DeepScrapingResult = {
    animes: new Map(),
    totalAnimes: 0,
    totalEpisodes: 0,
    totalFilms: 0,
    totalOAV: 0,
    totalScans: 0,
    genres: new Set(),
    years: new Set(),
    languages: new Set(['VF', 'VOSTFR', 'VJ'])
  };

  public async performDeepScraping(): Promise<DeepScrapingResult> {
    console.log('🚀 Démarrage du scraping profond d\'anime-sama.fr...');
    
    try {
      // Étape 1: Scraper le catalogue principal
      await this.scrapeCatalogue();
      
      // Étape 2: Scraper les sections spéciales
      await this.scrapeSpecialSections();
      
      // Étape 3: Calculer les statistiques
      this.calculateStatistics();
      
      return this.results;
    } catch (error) {
      console.error('❌ Erreur lors du scraping profond:', error);
      throw error;
    }
  }

  private async scrapeCatalogue(): Promise<void> {
    console.log('📚 Scraping du catalogue complet...');
    
    try {
      // Parcourir toutes les pages du catalogue
      let page = 1;
      let hasMorePages = true;
      
      while (hasMorePages && page <= 50) { // Limite de sécurité
        console.log(`📄 Scraping page ${page}...`);
        
        try {
          const response = await this.axiosInstance.get(`${this.baseUrl}/catalogue?page=${page}`);
          const $ = cheerio.load(response.data);
          
          // Chercher tous les animes sur la page
          const animeElements = $('a[href*="/catalogue/"]').filter((_, el) => {
            const href = $(el).attr('href') || '';
            return !!href.match(/\/catalogue\/[^\/]+\/?$/);
          });
          
          if (animeElements.length === 0) {
            hasMorePages = false;
            break;
          }
          
          // Traiter chaque anime trouvé
          for (let i = 0; i < animeElements.length; i++) {
            const element = animeElements.eq(i);
            const href = element.attr('href');
            if (href) {
              await this.processAnimeLink(href, element);
            }
          }
          
          page++;
          
          // Pause pour éviter le rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          console.warn(`⚠️ Erreur page ${page}, on continue...`);
          page++;
        }
      }
      
      console.log(`✅ Catalogue scraped: ${this.results.animes.size} animes trouvés`);
      
    } catch (error) {
      console.error('❌ Erreur scraping catalogue:', error);
    }
  }

  private async processAnimeLink(href: string, element: cheerio.Cheerio<any>): Promise<void> {
    try {
      const fullUrl = href.startsWith('http') ? href : `${this.baseUrl}${href}`;
      const animeId = this.extractAnimeId(href);
      
      if (!animeId || this.results.animes.has(animeId)) {
        return; // Déjà traité
      }
      
      const anime: AnimeComplete = {
        id: animeId,
        title: element.text().trim() || animeId,
        url: fullUrl,
        genres: [],
        seasons: [],
        films: [],
        oav: [],
        scans: [],
        specials: [],
        totalContent: 0
      };
      
      // Extraire l'image si disponible
      const img = element.find('img').first();
      if (img.length) {
        anime.image = img.attr('src') || img.attr('data-src');
      }
      
      // Scraper les détails de l'anime
      await this.scrapeAnimeDetails(anime);
      
      this.results.animes.set(animeId, anime);
      this.results.totalAnimes++;
      
    } catch (error) {
      console.warn(`⚠️ Erreur traitement anime: ${href}`);
    }
  }

  private async scrapeAnimeDetails(anime: AnimeComplete): Promise<void> {
    try {
      const response = await this.axiosInstance.get(anime.url);
      const $ = cheerio.load(response.data);
      
      // Extraire la description
      const description = $('.description, .synopsis, [class*="desc"]').first().text().trim();
      if (description) {
        anime.description = description;
      }
      
      // Extraire les genres
      $('.genre, .tag, [class*="genre"]').each((_, el) => {
        const genre = $(el).text().trim();
        if (genre && !anime.genres.includes(genre)) {
          anime.genres.push(genre);
          this.results.genres.add(genre);
        }
      });
      
      // Extraire l'année
      const yearMatch = response.data.match(/(\d{4})/);
      if (yearMatch) {
        anime.year = yearMatch[1];
        this.results.years.add(yearMatch[1]);
      }
      
      // Extraire le statut
      const status = $('.status, [class*="status"]').first().text().trim();
      if (status) {
        anime.status = status;
      }
      
      // Scraper les saisons
      await this.scrapeSeasons(anime, $);
      
      // Scraper les films
      await this.scrapeFilms(anime, $);
      
      // Scraper les OAV
      await this.scrapeOAV(anime, $);
      
      // Scraper les scans
      await this.scrapeScans(anime, $);
      
      // Calculer le total de contenu
      anime.totalContent = anime.seasons.reduce((sum, s) => sum + s.episodes.length, 0) +
                          anime.films.length + anime.oav.length + anime.scans.length;
      
    } catch (error) {
      console.warn(`⚠️ Erreur scraping détails pour ${anime.id}`);
    }
  }

  private async scrapeSeasons(anime: AnimeComplete, $: cheerio.CheerioAPI): Promise<void> {
    // Chercher tous les liens de saisons
    $('a[href*="saison"]').each((_, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim();
      
      if (href) {
        const seasonMatch = href.match(/saison(\d+)/);
        if (seasonMatch) {
          const seasonNumber = parseInt(seasonMatch[1]);
          const languageMatch = href.match(/(vf|vostfr|vj)/i);
          const language = languageMatch ? languageMatch[1].toUpperCase() : 'VOSTFR';
          
          // Trouver ou créer la saison
          let season = anime.seasons.find(s => s.number === seasonNumber);
          if (!season) {
            season = {
              number: seasonNumber,
              name: `Saison ${seasonNumber}`,
              episodes: [],
              languages: []
            };
            anime.seasons.push(season);
          }
          
          if (!season.languages.includes(language)) {
            season.languages.push(language);
          }
        }
      }
    });
    
    // Trier les saisons par numéro
    anime.seasons.sort((a, b) => a.number - b.number);
  }

  private async scrapeFilms(anime: AnimeComplete, $: cheerio.CheerioAPI): Promise<void> {
    $('a[href*="film"]').each((_, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim();
      
      if (href) {
        const languageMatch = href.match(/(vf|vostfr|vj)/i);
        const language = languageMatch ? languageMatch[1].toUpperCase() : 'VOSTFR';
        
        const film: ContentItem = {
          id: `${anime.id}-film`,
          title: text || 'Film',
          url: href.startsWith('http') ? href : `${this.baseUrl}${href}`,
          type: 'film',
          languages: [language]
        };
        
        // Éviter les doublons
        if (!anime.films.find(f => f.url === film.url)) {
          anime.films.push(film);
          this.results.totalFilms++;
        }
      }
    });
  }

  private async scrapeOAV(anime: AnimeComplete, $: cheerio.CheerioAPI): Promise<void> {
    $('a[href*="oav"], a[href*="ova"]').each((_, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim();
      
      if (href) {
        const languageMatch = href.match(/(vf|vostfr|vj)/i);
        const language = languageMatch ? languageMatch[1].toUpperCase() : 'VOSTFR';
        
        const oav: ContentItem = {
          id: `${anime.id}-oav`,
          title: text || 'OAV',
          url: href.startsWith('http') ? href : `${this.baseUrl}${href}`,
          type: 'oav',
          languages: [language]
        };
        
        if (!anime.oav.find(o => o.url === oav.url)) {
          anime.oav.push(oav);
          this.results.totalOAV++;
        }
      }
    });
  }

  private async scrapeScans(anime: AnimeComplete, $: cheerio.CheerioAPI): Promise<void> {
    $('a[href*="scan"], a[href*="manga"]').each((_, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim();
      
      if (href) {
        const scan: ContentItem = {
          id: `${anime.id}-scan`,
          title: text || 'Scan',
          url: href.startsWith('http') ? href : `${this.baseUrl}${href}`,
          type: 'scan',
          languages: ['FR'] // Les scans sont généralement en français
        };
        
        if (!anime.scans.find(s => s.url === scan.url)) {
          anime.scans.push(scan);
          this.results.totalScans++;
        }
      }
    });
  }

  private async scrapeSpecialSections(): Promise<void> {
    console.log('✨ Scraping des sections spéciales...');
    
    const specialUrls = [
      '/trending',
      '/nouveautes',
      '/populaire',
      '/random'
    ];
    
    for (const url of specialUrls) {
      try {
        const response = await this.axiosInstance.get(`${this.baseUrl}${url}`);
        const $ = cheerio.load(response.data);
        
        // Traiter les animes trouvés dans ces sections
        $('a[href*="/catalogue/"]').each((_, el) => {
          const href = $(el).attr('href');
          if (href) {
            this.processAnimeLink(href, $(el));
          }
        });
        
      } catch (error) {
        console.warn(`⚠️ Section ${url} non accessible`);
      }
    }
  }

  private calculateStatistics(): void {
    // Calculer le total des épisodes
    this.results.totalEpisodes = Array.from(this.results.animes.values())
      .reduce((sum, anime) => {
        return sum + anime.seasons.reduce((s, season) => s + season.episodes.length, 0);
      }, 0);
      
    console.log('📊 Statistiques finales:');
    console.log(`- Animes: ${this.results.totalAnimes}`);
    console.log(`- Épisodes: ${this.results.totalEpisodes}`);
    console.log(`- Films: ${this.results.totalFilms}`);
    console.log(`- OAV: ${this.results.totalOAV}`);
    console.log(`- Scans: ${this.results.totalScans}`);
    console.log(`- Genres: ${this.results.genres.size}`);
    console.log(`- Années: ${this.results.years.size}`);
  }

  private extractAnimeId(url: string): string {
    const match = url.match(/\/catalogue\/([^\/]+)/);
    return match ? match[1] : '';
  }
}

export const animeSamaDeepScraper = new AnimeSamaDeepScraper();