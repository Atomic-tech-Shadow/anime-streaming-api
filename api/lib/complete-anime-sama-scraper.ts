import * as cheerio from 'cheerio';
import {
  createAxiosInstance,
  randomDelay,
  BASE_URL
} from './core.js';

export interface CompleteAnimeData {
  id: string;
  title: string;
  description?: string;
  type: 'series' | 'film' | 'oav' | 'scan' | 'special';
  languages: string[];
  seasons?: number;
  episodes?: number;
  image?: string;
  genres: string[];
  status: string;
  year?: string;
  url: string;
  alternativeTitles?: string[];
}

/**
 * Scraper complet pour extraire 100% du contenu d'anime-sama.fr
 * Couvre tous les types : séries, films, OAV, scans, spéciaux
 * Toutes les langues : VF, VOSTFR, VJ
 */
export class CompleteAnimeSamaScraper {
  private axiosInstance = createAxiosInstance();
  private discoveredUrls = new Set<string>();
  private scrapedContent = new Map<string, CompleteAnimeData>();
  
  /**
   * Extraction complète de tout le contenu d'anime-sama.fr
   */
  public async scrapeCompleteContent(): Promise<CompleteAnimeData[]> {
    console.log('🚀 Starting complete scrape of anime-sama.fr...');
    
    try {
      // 1. Scraper la page d'accueil pour découvrir toutes les URLs
      await this.discoverAllUrls();
      
      // 2. Scraper le sitemap si disponible
      await this.scrapeSitemap();
      
      // 3. Scraper par pagination
      await this.scrapePagination();
      
      // 4. Scraper par catégories
      await this.scrapeByCategories();
      
      // 5. Scraper par genres
      await this.scrapeByGenres();
      
      // 6. Extraire les détails de chaque contenu découvert
      await this.extractContentDetails();
      
      const results = Array.from(this.scrapedContent.values());
      
      console.log(`✅ Complete scrape finished: ${results.length} items extracted`);
      console.log(`📺 Series: ${results.filter(r => r.type === 'series').length}`);
      console.log(`🎬 Films: ${results.filter(r => r.type === 'film').length}`);
      console.log(`📖 Scans: ${results.filter(r => r.type === 'scan').length}`);
      console.log(`🎯 OAV: ${results.filter(r => r.type === 'oav').length}`);
      console.log(`⭐ Specials: ${results.filter(r => r.type === 'special').length}`);
      
      return results;
      
    } catch (error: any) {
      console.error('Complete scrape error:', error);
      return Array.from(this.scrapedContent.values());
    }
  }

  /**
   * Découvrir toutes les URLs depuis la page d'accueil
   */
  private async discoverAllUrls(): Promise<void> {
    try {
      console.log('🔍 Discovering URLs from homepage...');
      await randomDelay(500, 1000);
      
      const response = await this.axiosInstance.get('/');
      const $ = cheerio.load(response.data);
      
      // Extraire tous les liens vers le catalogue
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href') || '';
        
        if (href.includes('anime-sama.fr/catalogue/') || href.startsWith('/catalogue/')) {
          const fullUrl = href.startsWith('http') ? href : `https://anime-sama.fr${href}`;
          this.discoveredUrls.add(fullUrl);
        }
      });
      
      // Chercher les URLs dans le JavaScript
      const scriptTags = $('script').get();
      for (const script of scriptTags) {
        const scriptContent = $(script).html() || '';
        const urlMatches = scriptContent.match(/["']https?:\/\/anime-sama\.fr\/catalogue\/[^"']+["']/g);
        
        if (urlMatches) {
          urlMatches.forEach(match => {
            const url = match.replace(/["']/g, '');
            this.discoveredUrls.add(url);
          });
        }
      }
      
      console.log(`Found ${this.discoveredUrls.size} initial URLs`);
      
    } catch (error) {
      console.error('Error discovering URLs:', error);
    }
  }

  /**
   * Scraper le sitemap pour découvrir plus d'URLs
   */
  private async scrapeSitemap(): Promise<void> {
    try {
      console.log('🗺️ Scraping sitemap...');
      
      const sitemapUrls = [
        '/sitemap.xml',
        '/sitemap.txt',
        '/robots.txt'
      ];
      
      for (const sitemapUrl of sitemapUrls) {
        try {
          await randomDelay(300, 600);
          const response = await this.axiosInstance.get(sitemapUrl);
          
          if (response.status === 200) {
            const content = response.data;
            
            // Extraire les URLs du sitemap XML
            const xmlUrlMatches = content.match(/<loc>(.*?)<\/loc>/g);
            if (xmlUrlMatches) {
              xmlUrlMatches.forEach((match: string) => {
                const url = match.replace(/<\/?loc>/g, '');
                if (url.includes('/catalogue/')) {
                  this.discoveredUrls.add(url);
                }
              });
            }
            
            // Extraire les URLs du sitemap texte
            const textUrls = content.split('\n').filter((line: string) => 
              line.includes('anime-sama.fr/catalogue/')
            );
            textUrls.forEach((url: string) => this.discoveredUrls.add(url.trim()));
          }
        } catch (err) {
          // Sitemap n'existe pas, continuer
        }
      }
      
      console.log(`Total URLs after sitemap: ${this.discoveredUrls.size}`);
      
    } catch (error) {
      console.error('Error scraping sitemap:', error);
    }
  }

  /**
   * Scraper par pagination
   */
  private async scrapePagination(): Promise<void> {
    try {
      console.log('📄 Scraping pagination...');
      
      for (let page = 1; page <= 50; page++) {
        try {
          await randomDelay(500, 1000);
          
          const pageUrls = [
            `/catalogue?page=${page}`,
            `/catalogue/?page=${page}`,
            `/page/${page}`,
            `/?page=${page}`
          ];
          
          for (const pageUrl of pageUrls) {
            try {
              const response = await this.axiosInstance.get(pageUrl);
              
              if (response.status === 200) {
                const $ = cheerio.load(response.data);
                
                // Extraire les liens vers les animes
                $('a[href*="/catalogue/"]').each((_, el) => {
                  const href = $(el).attr('href') || '';
                  if (href) {
                    const fullUrl = href.startsWith('http') ? href : `https://anime-sama.fr${href}`;
                    this.discoveredUrls.add(fullUrl);
                  }
                });
                
                // Si pas de nouveaux liens, arrêter la pagination
                const currentSize = this.discoveredUrls.size;
                if (currentSize === this.discoveredUrls.size) {
                  console.log(`Pagination ended at page ${page}`);
                  break;
                }
              }
            } catch (err) {
              // URL n'existe pas
            }
          }
        } catch (err) {
          console.log(`Page ${page} not accessible`);
          break;
        }
      }
      
      console.log(`Total URLs after pagination: ${this.discoveredUrls.size}`);
      
    } catch (error) {
      console.error('Error scraping pagination:', error);
    }
  }

  /**
   * Scraper par catégories
   */
  private async scrapeByCategories(): Promise<void> {
    try {
      console.log('📂 Scraping by categories...');
      
      const categories = [
        '/films/',
        '/series/',
        '/oav/',
        '/scans/',
        '/specials/',
        '/catalogue/films/',
        '/catalogue/series/',
        '/catalogue/oav/',
        '/catalogue/scans/'
      ];
      
      for (const category of categories) {
        try {
          await randomDelay(400, 800);
          const response = await this.axiosInstance.get(category);
          
          if (response.status === 200) {
            const $ = cheerio.load(response.data);
            
            $('a[href*="/catalogue/"]').each((_, el) => {
              const href = $(el).attr('href') || '';
              if (href) {
                const fullUrl = href.startsWith('http') ? href : `https://anime-sama.fr${href}`;
                this.discoveredUrls.add(fullUrl);
              }
            });
          }
        } catch (err) {
          // Catégorie n'existe pas
        }
      }
      
      console.log(`Total URLs after categories: ${this.discoveredUrls.size}`);
      
    } catch (error) {
      console.error('Error scraping categories:', error);
    }
  }

  /**
   * Scraper par genres
   */
  private async scrapeByGenres(): Promise<void> {
    try {
      console.log('🎭 Scraping by genres...');
      
      // Découvrir les genres disponibles
      const response = await this.axiosInstance.get('/');
      const $ = cheerio.load(response.data);
      
      const genres = new Set<string>();
      
      // Extraire les genres depuis les liens ou les métadonnées
      $('a[href*="genre"], [data-genre], .genre').each((_, el) => {
        const genreText = $(el).text().trim().toLowerCase();
        const genreHref = $(el).attr('href') || '';
        
        if (genreText) genres.add(genreText);
        if (genreHref.includes('genre=')) {
          const genreMatch = genreHref.match(/genre=([^&]+)/);
          if (genreMatch) genres.add(genreMatch[1]);
        }
      });
      
      // Scraper chaque genre
      for (const genre of Array.from(genres).slice(0, 20)) {
        try {
          await randomDelay(300, 600);
          
          const genreUrls = [
            `/genre/${genre}`,
            `/catalogue?genre=${genre}`,
            `/?genre=${genre}`
          ];
          
          for (const genreUrl of genreUrls) {
            try {
              const response = await this.axiosInstance.get(genreUrl);
              
              if (response.status === 200) {
                const $ = cheerio.load(response.data);
                
                $('a[href*="/catalogue/"]').each((_, el) => {
                  const href = $(el).attr('href') || '';
                  if (href) {
                    const fullUrl = href.startsWith('http') ? href : `https://anime-sama.fr${href}`;
                    this.discoveredUrls.add(fullUrl);
                  }
                });
                break;
              }
            } catch (err) {
              // URL du genre n'existe pas
            }
          }
        } catch (err) {
          // Genre inaccessible
        }
      }
      
      console.log(`Total URLs after genres: ${this.discoveredUrls.size}`);
      
    } catch (error) {
      console.error('Error scraping genres:', error);
    }
  }

  /**
   * Extraire les détails de chaque contenu découvert
   */
  private async extractContentDetails(): Promise<void> {
    try {
      console.log(`📋 Extracting details for ${this.discoveredUrls.size} items...`);
      
      const urls = Array.from(this.discoveredUrls);
      let processed = 0;
      
      for (const url of urls) {
        try {
          await randomDelay(200, 500);
          
          const animeId = this.extractAnimeIdFromUrl(url);
          if (!animeId || this.scrapedContent.has(animeId)) {
            continue;
          }
          
          const response = await this.axiosInstance.get(url);
          
          if (response.status === 200) {
            const $ = cheerio.load(response.data);
            const contentData = this.extractContentData($, url, animeId);
            
            if (contentData) {
              this.scrapedContent.set(animeId, contentData);
            }
          }
          
          processed++;
          if (processed % 100 === 0) {
            console.log(`Processed ${processed}/${urls.length} items...`);
          }
          
        } catch (error) {
          // Erreur d'extraction, continuer
        }
      }
      
      console.log(`✅ Details extraction complete: ${this.scrapedContent.size} items`);
      
    } catch (error) {
      console.error('Error extracting content details:', error);
    }
  }

  /**
   * Extraire l'ID d'anime depuis une URL
   */
  private extractAnimeIdFromUrl(url: string): string | null {
    const match = url.match(/\/catalogue\/([^\/]+)/);
    return match ? match[1] : null;
  }

  /**
   * Extraire les données d'un contenu depuis sa page
   */
  private extractContentData($: cheerio.CheerioAPI, url: string, animeId: string): CompleteAnimeData | null {
    try {
      // Extraire le titre
      const title = $('h1, .title, [class*="title"]').first().text().trim() ||
                   $('title').text().replace(' - Anime Sama', '').trim() ||
                   animeId.replace(/-/g, ' ');
      
      if (!title) return null;
      
      // Déterminer le type de contenu
      const type = this.determineContentType(url, $);
      
      // Extraire les langues disponibles
      const languages = this.extractAvailableLanguages($, url);
      
      // Extraire les genres
      const genres = this.extractGenres($);
      
      // Extraire la description
      const description = $('[class*="description"], [class*="synopsis"], .synopsis, p').first().text().trim();
      
      // Extraire l'image
      const image = $('img[src*="anime"]').first().attr('src') || 
                   $('img').first().attr('src');
      
      // Extraire le statut
      const status = this.extractStatus($);
      
      // Extraire l'année
      const year = this.extractYear($);
      
      return {
        id: animeId,
        title,
        description: description || undefined,
        type,
        languages,
        image: image ? (image.startsWith('http') ? image : `https://anime-sama.fr${image}`) : undefined,
        genres,
        status,
        year,
        url,
        alternativeTitles: this.extractAlternativeTitles($)
      };
      
    } catch (error) {
      console.error(`Error extracting data for ${animeId}:`, error);
      return null;
    }
  }

  /**
   * Déterminer le type de contenu
   */
  private determineContentType(url: string, $: cheerio.CheerioAPI): 'series' | 'film' | 'oav' | 'scan' | 'special' {
    if (url.includes('/film/') || url.includes('/films/')) return 'film';
    if (url.includes('/oav/')) return 'oav';
    if (url.includes('/scan/') || url.includes('/scans/')) return 'scan';
    if (url.includes('/special/')) return 'special';
    
    // Analyser le contenu de la page
    const pageText = $.text().toLowerCase();
    if (pageText.includes('film') && !pageText.includes('saison')) return 'film';
    if (pageText.includes('oav') || pageText.includes('ova')) return 'oav';
    if (pageText.includes('scan') || pageText.includes('manga')) return 'scan';
    
    return 'series'; // Par défaut
  }

  /**
   * Extraire les langues disponibles
   */
  private extractAvailableLanguages($: cheerio.CheerioAPI, url: string): string[] {
    const languages = new Set<string>();
    
    // Depuis l'URL
    if (url.includes('/vf/')) languages.add('VF');
    if (url.includes('/vostfr/')) languages.add('VOSTFR');
    if (url.includes('/vj/')) languages.add('VJ');
    
    // Depuis les liens sur la page
    $('a[href*="/vf/"], [data-lang="vf"]').each((_, el) => { 
      languages.add('VF');
      return undefined;
    });
    $('a[href*="/vostfr/"], [data-lang="vostfr"]').each((_, el) => { 
      languages.add('VOSTFR');
      return undefined;
    });
    $('a[href*="/vj/"], [data-lang="vj"]').each((_, el) => { 
      languages.add('VJ');
      return undefined;
    });
    
    // Depuis le texte de la page
    const pageText = $.text().toLowerCase();
    if (pageText.includes('français') || pageText.includes(' vf ')) languages.add('VF');
    if (pageText.includes('sous-titr') || pageText.includes('vostfr')) languages.add('VOSTFR');
    if (pageText.includes('japonais') || pageText.includes(' vj ')) languages.add('VJ');
    
    return Array.from(languages);
  }

  /**
   * Extraire les genres
   */
  private extractGenres($: cheerio.CheerioAPI): string[] {
    const genres = new Set<string>();
    
    $('[class*="genre"], .genre, [data-genre]').each((_, el) => {
      const genreText = $(el).text().trim();
      if (genreText && genreText.length < 20) {
        genres.add(genreText);
      }
    });
    
    return Array.from(genres);
  }

  /**
   * Extraire le statut
   */
  private extractStatus($: cheerio.CheerioAPI): string {
    const statusSelectors = [
      '[class*="status"]',
      '.status',
      '[data-status]'
    ];
    
    for (const selector of statusSelectors) {
      const status = $(selector).text().trim();
      if (status) return status;
    }
    
    const pageText = $.text().toLowerCase();
    if (pageText.includes('terminé') || pageText.includes('fini')) return 'Terminé';
    if (pageText.includes('en cours') || pageText.includes('ongoing')) return 'En cours';
    
    return 'Inconnu';
  }

  /**
   * Extraire l'année
   */
  private extractYear($: cheerio.CheerioAPI): string | undefined {
    const yearMatch = $.text().match(/\b(19|20)\d{2}\b/);
    return yearMatch ? yearMatch[0] : undefined;
  }

  /**
   * Extraire les titres alternatifs
   */
  private extractAlternativeTitles($: cheerio.CheerioAPI): string[] {
    const altTitles: string[] = [];
    
    $('[class*="alt"], [class*="alternative"], .alternative').each((_, el) => {
      const altTitle = $(el).text().trim();
      if (altTitle && altTitle.length > 0) {
        altTitles.push(altTitle);
      }
    });
    
    return altTitles;
  }

  /**
   * Obtenir le catalogue complet avec cache
   */
  public async getCompleteAnimeCatalogue(): Promise<CompleteAnimeData[]> {
    try {
      // Si le cache est vide, faire un scraping complet
      if (this.scrapedContent.size === 0) {
        return await this.scrapeCompleteContent();
      }
      
      return Array.from(this.scrapedContent.values());
    } catch (error) {
      console.error('Error getting complete catalogue:', error);
      return [];
    }
  }

  /**
   * Rechercher dans le contenu complet
   */
  public async searchCompleteAnimes(query: string): Promise<CompleteAnimeData[]> {
    try {
      const catalogue = await this.getCompleteAnimeCatalogue();
      const searchQuery = query.toLowerCase().trim();
      
      if (!searchQuery) return catalogue.slice(0, 20); // Retourner les 20 premiers si pas de recherche
      
      const results = catalogue.filter(anime => 
        anime.title.toLowerCase().includes(searchQuery) ||
        anime.alternativeTitles?.some(alt => alt.toLowerCase().includes(searchQuery)) ||
        anime.genres.some(genre => genre.toLowerCase().includes(searchQuery)) ||
        anime.description?.toLowerCase().includes(searchQuery)
      );
      
      // Trier par pertinence
      return results.sort((a, b) => {
        const aScore = this.calculateRelevanceScore(a, searchQuery);
        const bScore = this.calculateRelevanceScore(b, searchQuery);
        return bScore - aScore;
      });
      
    } catch (error) {
      console.error('Error searching complete animes:', error);
      return [];
    }
  }

  /**
   * Calculer le score de pertinence pour la recherche
   */
  private calculateRelevanceScore(anime: CompleteAnimeData, query: string): number {
    let score = 0;
    const queryLower = query.toLowerCase();
    
    // Titre exact
    if (anime.title.toLowerCase() === queryLower) return 100;
    
    // Titre commence par la recherche
    if (anime.title.toLowerCase().startsWith(queryLower)) score += 50;
    
    // Titre contient la recherche
    if (anime.title.toLowerCase().includes(queryLower)) score += 30;
    
    // Titres alternatifs
    anime.alternativeTitles?.forEach(alt => {
      if (alt.toLowerCase().includes(queryLower)) score += 20;
    });
    
    // Genres
    anime.genres.forEach(genre => {
      if (genre.toLowerCase().includes(queryLower)) score += 10;
    });
    
    // Description
    if (anime.description?.toLowerCase().includes(queryLower)) score += 5;
    
    return score;
  }
}

export const completeAnimeSamaScraper = new CompleteAnimeSamaScraper();