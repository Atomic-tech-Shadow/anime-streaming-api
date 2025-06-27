import * as cheerio from 'cheerio';
import {
  createAxiosInstance,
  randomDelay,
  BASE_URL,
  cleanPageContent,
  getFromCache,
  setCache
} from './core.js';

/**
 * Scraper complet pour extraire 100% du catalogue anime-sama.fr
 * Explore toutes les pages, sections et structures du site
 */
export class CompleteAnimeSamaScraper {
  private axiosInstance = createAxiosInstance();
  private completeAnimeList: any[] = [];
  private lastFullScan: number = 0;
  private readonly FULL_SCAN_INTERVAL = 30 * 60 * 1000; // 30 minutes
  
  /**
   * Scanner complet du site anime-sama.fr
   */
  public async getCompleteAnimeCatalogue(): Promise<any[]> {
    const cacheKey = 'complete_anime_catalogue';
    const cached = getFromCache(cacheKey);
    
    if (cached && Date.now() - this.lastFullScan < this.FULL_SCAN_INTERVAL) {
      return cached;
    }

    console.log('🔍 Starting complete scan of anime-sama.fr...');
    
    try {
      const allAnimes = new Map<string, any>();
      
      // 1. Scanner la page d'accueil
      await this.scanHomePage(allAnimes);
      
      // 2. Scanner le catalogue principal
      await this.scanMainCatalogue(allAnimes);
      
      // 3. Scanner les pages de pagination
      await this.scanCataloguePagination(allAnimes);
      
      // 4. Scanner les liens dans le sitemap
      await this.scanSitemap(allAnimes);
      
      // 5. Scanner les scripts JavaScript pour URLs cachées
      await this.scanJavaScriptUrls(allAnimes);
      
      // 6. Scanner les sections spéciales (films, OAV, etc.)
      await this.scanSpecialSections(allAnimes);
      
      this.completeAnimeList = Array.from(allAnimes.values());
      this.lastFullScan = Date.now();
      
      setCache(cacheKey, this.completeAnimeList, 30 * 60 * 1000);
      
      console.log(`✅ Complete scan finished: ${this.completeAnimeList.length} animes found`);
      return this.completeAnimeList;
      
    } catch (error: any) {
      console.error('Error during complete scan:', error);
      return this.completeAnimeList; // Retourner ce qu'on a déjà
    }
  }

  /**
   * Scanner la page d'accueil pour les animes en vedette
   */
  private async scanHomePage(allAnimes: Map<string, any>): Promise<void> {
    try {
      console.log('📍 Scanning home page...');
      await randomDelay(500, 1000);
      
      const response = await this.axiosInstance.get('/');
      const $ = cheerio.load(response.data);
      
      // Extraire tous les liens vers des animes
      $('a[href*="/catalogue/"]').each((_, el) => {
        const href = $(el).attr('href');
        if (href) {
          const animeId = this.extractAnimeIdFromUrl(href);
          if (animeId && !allAnimes.has(animeId)) {
            allAnimes.set(animeId, {
              id: animeId,
              title: this.formatAnimeTitle(animeId),
              url: `${BASE_URL}/catalogue/${animeId}/`,
              source: 'homepage',
              authentic: true
            });
          }
        }
      });
      
      console.log(`📍 Home page: ${allAnimes.size} animes found`);
    } catch (error) {
      console.error('Error scanning home page:', error);
    }
  }

  /**
   * Scanner le catalogue principal
   */
  private async scanMainCatalogue(allAnimes: Map<string, any>): Promise<void> {
    try {
      console.log('📂 Scanning main catalogue...');
      await randomDelay(500, 1000);
      
      const urls = [
        '/catalogue/',
        '/catalogue',
        '/anime/',
        '/anime'
      ];
      
      for (const url of urls) {
        try {
          const response = await this.axiosInstance.get(url);
          const $ = cheerio.load(response.data);
          
          // Méthode 1: Links directs
          $('a[href*="/catalogue/"]').each((_, el) => {
            const href = $(el).attr('href');
            if (href) {
              const animeId = this.extractAnimeIdFromUrl(href);
              if (animeId && !allAnimes.has(animeId)) {
                allAnimes.set(animeId, {
                  id: animeId,
                  title: $(el).text().trim() || this.formatAnimeTitle(animeId),
                  url: `${BASE_URL}/catalogue/${animeId}/`,
                  source: 'catalogue',
                  authentic: true
                });
              }
            }
          });
          
          // Méthode 2: Analyse du HTML brut
          const htmlContent = response.data;
          const cataloguePattern = /\/catalogue\/([^\/\s"'<>]+)\//g;
          let match;
          
          while ((match = cataloguePattern.exec(htmlContent)) !== null) {
            const animeId = match[1];
            if (this.isValidAnimeId(animeId) && !allAnimes.has(animeId)) {
              allAnimes.set(animeId, {
                id: animeId,
                title: this.formatAnimeTitle(animeId),
                url: `${BASE_URL}/catalogue/${animeId}/`,
                source: 'catalogue-regex',
                authentic: true
              });
            }
          }
          
        } catch (err) {
          console.log(`Failed to scan ${url}, continuing...`);
        }
      }
      
      console.log(`📂 Main catalogue: ${allAnimes.size} animes found`);
    } catch (error) {
      console.error('Error scanning main catalogue:', error);
    }
  }

  /**
   * Scanner les pages de pagination du catalogue
   */
  private async scanCataloguePagination(allAnimes: Map<string, any>): Promise<void> {
    try {
      console.log('📄 Scanning catalogue pagination...');
      
      // Essayer plusieurs pages de pagination
      for (let page = 1; page <= 20; page++) {
        try {
          await randomDelay(300, 700);
          
          const urls = [
            `/catalogue/page/${page}/`,
            `/catalogue/?page=${page}`,
            `/anime/page/${page}/`,
            `/page/${page}/`
          ];
          
          let foundAnimes = false;
          
          for (const url of urls) {
            try {
              const response = await this.axiosInstance.get(url);
              if (response.status === 200 && response.data) {
                const $ = cheerio.load(response.data);
                
                const initialCount = allAnimes.size;
                
                $('a[href*="/catalogue/"]').each((_, el) => {
                  const href = $(el).attr('href');
                  if (href) {
                    const animeId = this.extractAnimeIdFromUrl(href);
                    if (animeId && !allAnimes.has(animeId)) {
                      allAnimes.set(animeId, {
                        id: animeId,
                        title: $(el).text().trim() || this.formatAnimeTitle(animeId),
                        url: `${BASE_URL}/catalogue/${animeId}/`,
                        source: `page-${page}`,
                        authentic: true
                      });
                    }
                  }
                });
                
                if (allAnimes.size > initialCount) {
                  foundAnimes = true;
                  console.log(`📄 Page ${page}: +${allAnimes.size - initialCount} animes`);
                  break; // Cette URL fonctionne, pas besoin d'essayer les autres
                }
              }
            } catch (err) {
              continue; // Essayer l'URL suivante
            }
          }
          
          // Si aucune page ne retourne de nouveaux animes, arrêter
          if (!foundAnimes) {
            console.log(`📄 No more animes found at page ${page}, stopping pagination scan`);
            break;
          }
          
        } catch (error: any) {
          console.log(`Error scanning page ${page}:`, error?.message || error);
        }
      }
      
      console.log(`📄 Pagination scan complete: ${allAnimes.size} total animes`);
    } catch (error) {
      console.error('Error scanning pagination:', error);
    }
  }

  /**
   * Scanner le sitemap s'il existe
   */
  private async scanSitemap(allAnimes: Map<string, any>): Promise<void> {
    try {
      console.log('🗺️ Scanning sitemap...');
      await randomDelay(500, 1000);
      
      const sitemapUrls = [
        '/sitemap.xml',
        '/sitemap_index.xml',
        '/robots.txt'
      ];
      
      for (const sitemapUrl of sitemapUrls) {
        try {
          const response = await this.axiosInstance.get(sitemapUrl);
          if (response.status === 200) {
            const content = response.data;
            
            if (sitemapUrl.endsWith('.xml')) {
              // Parser le XML du sitemap
              const $ = cheerio.load(content, { xmlMode: true });
              $('url loc, loc').each((_, el) => {
                const url = $(el).text();
                if (url.includes('/catalogue/')) {
                  const animeId = this.extractAnimeIdFromUrl(url);
                  if (animeId && !allAnimes.has(animeId)) {
                    allAnimes.set(animeId, {
                      id: animeId,
                      title: this.formatAnimeTitle(animeId),
                      url: `${BASE_URL}/catalogue/${animeId}/`,
                      source: 'sitemap',
                      authentic: true
                    });
                  }
                }
              });
            } else if (sitemapUrl.endsWith('robots.txt')) {
              // Extraire les URLs du robots.txt
              const lines = content.split('\n');
              lines.forEach((line: string) => {
                if (line.includes('/catalogue/')) {
                  const animeId = this.extractAnimeIdFromUrl(line);
                  if (animeId && !allAnimes.has(animeId)) {
                    allAnimes.set(animeId, {
                      id: animeId,
                      title: this.formatAnimeTitle(animeId),
                      url: `${BASE_URL}/catalogue/${animeId}/`,
                      source: 'robots',
                      authentic: true
                    });
                  }
                }
              });
            }
          }
        } catch (err) {
          // Sitemap n'existe pas, continuer
        }
      }
      
      console.log(`🗺️ Sitemap scan: ${allAnimes.size} total animes`);
    } catch (error) {
      console.error('Error scanning sitemap:', error);
    }
  }

  /**
   * Scanner les URLs cachées dans les scripts JavaScript
   */
  private async scanJavaScriptUrls(allAnimes: Map<string, any>): Promise<void> {
    try {
      console.log('📜 Scanning JavaScript URLs...');
      await randomDelay(500, 1000);
      
      const response = await this.axiosInstance.get('/');
      const $ = cheerio.load(response.data);
      
      // Analyser tous les scripts
      $('script').each((_, el) => {
        const scriptContent = $(el).html() || '';
        
        // Chercher les patterns d'URLs d'animes
        const patterns = [
          /['"]\/catalogue\/([^\/\s"']+)\/['"]/g,
          /url:\s*['"]\/catalogue\/([^\/\s"']+)\//g,
          /href\s*=\s*['"]\/catalogue\/([^\/\s"']+)\//g,
          /path:\s*['"]\/catalogue\/([^\/\s"']+)\//g,
          /'([^']*catalogue\/[^\/\s']+\/)'/g,
          /"([^"]*catalogue\/[^\/\s"]+\/)"/g
        ];
        
        patterns.forEach(pattern => {
          let match;
          while ((match = pattern.exec(scriptContent)) !== null) {
            const animeId = match[1] || this.extractAnimeIdFromUrl(match[0]);
            if (animeId && this.isValidAnimeId(animeId) && !allAnimes.has(animeId)) {
              allAnimes.set(animeId, {
                id: animeId,
                title: this.formatAnimeTitle(animeId),
                url: `${BASE_URL}/catalogue/${animeId}/`,
                source: 'javascript',
                authentic: true
              });
            }
          }
        });
      });
      
      console.log(`📜 JavaScript scan: ${allAnimes.size} total animes`);
    } catch (error) {
      console.error('Error scanning JavaScript:', error);
    }
  }

  /**
   * Scanner les sections spéciales (films, OAV, etc.)
   */
  private async scanSpecialSections(allAnimes: Map<string, any>): Promise<void> {
    try {
      console.log('🎬 Scanning special sections...');
      
      const specialSections = [
        '/films/',
        '/film/',
        '/movies/',
        '/oav/',
        '/ova/',
        '/special/',
        '/specials/',
        '/scan/',
        '/scans/',
        '/manga/',
        '/top/',
        '/populaire/',
        '/popular/',
        '/recent/',
        '/nouveaute/',
        '/nouveautes/',
        '/trending/',
        '/genre/',
        '/genres/',
        '/category/',
        '/categories/'
      ];
      
      for (const section of specialSections) {
        try {
          await randomDelay(300, 600);
          
          const response = await this.axiosInstance.get(section);
          if (response.status === 200) {
            const $ = cheerio.load(response.data);
            
            $('a[href*="/catalogue/"]').each((_, el) => {
              const href = $(el).attr('href');
              if (href) {
                const animeId = this.extractAnimeIdFromUrl(href);
                if (animeId && !allAnimes.has(animeId)) {
                  allAnimes.set(animeId, {
                    id: animeId,
                    title: $(el).text().trim() || this.formatAnimeTitle(animeId),
                    url: `${BASE_URL}/catalogue/${animeId}/`,
                    source: section.replace(/\//g, ''),
                    authentic: true
                  });
                }
              }
            });
          }
        } catch (err) {
          // Section n'existe pas, continuer
        }
      }
      
      console.log(`🎬 Special sections scan: ${allAnimes.size} total animes`);
    } catch (error) {
      console.error('Error scanning special sections:', error);
    }
  }

  /**
   * Recherche dans le catalogue complet
   */
  public async searchCompleteAnimes(query: string): Promise<any[]> {
    const catalogue = await this.getCompleteAnimeCatalogue();
    const searchTerm = query.toLowerCase().trim();
    
    return catalogue.filter(anime => 
      anime.title.toLowerCase().includes(searchTerm) ||
      anime.id.toLowerCase().includes(searchTerm)
    );
  }

  /**
   * Utilitaires
   */
  private extractAnimeIdFromUrl(url: string): string | null {
    const matches = url.match(/\/catalogue\/([^\/\s"'<>]+)/);
    return matches ? matches[1] : null;
  }

  private isValidAnimeId(animeId: string): boolean {
    return Boolean(animeId && 
           animeId !== 'catalogue' && 
           animeId.length > 2 && 
           !animeId.includes('?') &&
           !animeId.includes('#') &&
           !animeId.includes('<') &&
           !animeId.includes('>') &&
           !animeId.startsWith('http') &&
           !animeId.includes('..') &&
           !/^\d+$/.test(animeId)); // Pas que des chiffres
  }

  private formatAnimeTitle(animeId: string): string {
    return animeId
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
      .replace(/\b(And|Or|The|Of|In|On|At|To|For|With|By)\b/g, word => word.toLowerCase())
      .replace(/^(The|A|An)\s/, match => match.charAt(0).toUpperCase() + match.slice(1));
  }
}

export const completeAnimeSamaScraper = new CompleteAnimeSamaScraper();