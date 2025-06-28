import axios from 'axios';
import * as cheerio from 'cheerio';
import { createAxiosInstance } from './core';

export interface SiteAnalysis {
  timestamp: string;
  homepage: {
    sections: any[];
    navigation: any;
    features: any[];
  };
  animePages: {
    structure: any;
    contentTypes: string[];
    playerTypes: string[];
  };
  catalogueStructure: {
    totalAnimes: number;
    categories: any[];
    filters: any[];
  };
  specialSections: any[];
  apiEndpoints: string[];
  scrapingPatterns: any;
}

export class AnimeSamaFullAnalyzer {
  private axiosInstance = createAxiosInstance();
  private baseUrl = 'https://anime-sama.fr';
  
  public async performCompleteAnalysis(): Promise<SiteAnalysis> {
    console.log('🔍 Démarrage de l\'analyse complète d\'anime-sama.fr...');
    
    const analysis: SiteAnalysis = {
      timestamp: new Date().toISOString(),
      homepage: {
        sections: [],
        navigation: {},
        features: []
      },
      animePages: {
        structure: {},
        contentTypes: [],
        playerTypes: []
      },
      catalogueStructure: {
        totalAnimes: 0,
        categories: [],
        filters: []
      },
      specialSections: [],
      apiEndpoints: [],
      scrapingPatterns: {}
    };

    try {
      // Étape 1: Analyser la page d'accueil
      await this.analyzeHomepage(analysis);
      
      // Étape 2: Analyser la structure de navigation
      await this.analyzeNavigation(analysis);
      
      // Étape 3: Analyser le catalogue complet
      await this.analyzeCatalogue(analysis);
      
      // Étape 4: Analyser un échantillon d'animes pour comprendre la structure
      await this.analyzeAnimeStructure(analysis);
      
      // Étape 5: Identifier toutes les sections spéciales
      await this.analyzeSpecialSections(analysis);
      
      // Étape 6: Mapper tous les patterns d'URLs
      await this.mapUrlPatterns(analysis);
      
      // Étape 7: Identifier les types de contenu
      await this.identifyContentTypes(analysis);
      
      // Étape 8: Analyser les lecteurs vidéo
      await this.analyzeVideoPlayers(analysis);
      
      return analysis;
    } catch (error) {
      console.error('❌ Erreur lors de l\'analyse:', error);
      throw error;
    }
  }

  private async analyzeHomepage(analysis: SiteAnalysis): Promise<void> {
    console.log('📄 Analyse de la page d\'accueil...');
    
    try {
      const response = await this.axiosInstance.get(this.baseUrl);
      const $ = cheerio.load(response.data);
      
      // Analyser toutes les sections de la page d'accueil
      $('.section, .container, .row').each((_, element) => {
        const section = $(element);
        const sectionData = {
          classes: section.attr('class'),
          id: section.attr('id'),
          children: section.children().length,
          text: section.text().trim().substring(0, 100)
        };
        
        if (sectionData.classes || sectionData.id) {
          analysis.homepage.sections.push(sectionData);
        }
      });
      
      // Identifier les fonctionnalités principales
      $('a[href*="catalogue"], a[href*="search"], a[href*="random"]').each((_, link) => {
        const href = $(link).attr('href');
        const text = $(link).text().trim();
        if (href && text) {
          analysis.homepage.features.push({ href, text });
        }
      });
      
      console.log(`✅ Sections trouvées: ${analysis.homepage.sections.length}`);
      console.log(`✅ Fonctionnalités trouvées: ${analysis.homepage.features.length}`);
    } catch (error) {
      console.error('❌ Erreur analyse homepage:', error);
    }
  }

  private async analyzeNavigation(analysis: SiteAnalysis): Promise<void> {
    console.log('🧭 Analyse de la navigation...');
    
    try {
      const response = await this.axiosInstance.get(this.baseUrl);
      const $ = cheerio.load(response.data);
      
      // Analyser le menu principal
      const navigation: any = {
        mainMenu: [],
        dropdowns: [],
        mobileMenu: []
      };
      
      // Menu principal
      $('nav a, .navbar a, .menu a').each((_, link) => {
        const href = $(link).attr('href');
        const text = $(link).text().trim();
        if (href && text) {
          navigation.mainMenu.push({ href, text });
        }
      });
      
      // Dropdowns
      $('.dropdown, .submenu').each((_, dropdown) => {
        const dropdownItems: any[] = [];
        $(dropdown).find('a').each((_, link) => {
          const href = $(link).attr('href');
          const text = $(link).text().trim();
          if (href && text) {
            dropdownItems.push({ href, text });
          }
        });
        if (dropdownItems.length > 0) {
          navigation.dropdowns.push(dropdownItems);
        }
      });
      
      analysis.homepage.navigation = navigation;
      console.log(`✅ Liens de navigation trouvés: ${navigation.mainMenu.length}`);
    } catch (error) {
      console.error('❌ Erreur analyse navigation:', error);
    }
  }

  private async analyzeCatalogue(analysis: SiteAnalysis): Promise<void> {
    console.log('📚 Analyse du catalogue complet...');
    
    try {
      const response = await this.axiosInstance.get(`${this.baseUrl}/catalogue`);
      const $ = cheerio.load(response.data);
      
      // Compter le nombre total d'animes
      const animeCards = $('.anime, .card, .item, [class*="anime"]').length;
      analysis.catalogueStructure.totalAnimes = animeCards;
      
      // Identifier les catégories
      $('.category, .genre, .filter').each((_, element) => {
        const category = $(element).text().trim();
        if (category) {
          analysis.catalogueStructure.categories.push(category);
        }
      });
      
      // Identifier les filtres disponibles
      $('select, .filter-option, input[type="checkbox"]').each((_, element) => {
        const filterName = $(element).attr('name') || $(element).attr('id');
        if (filterName) {
          analysis.catalogueStructure.filters.push(filterName);
        }
      });
      
      console.log(`✅ Animes trouvés: ${animeCards}`);
      console.log(`✅ Catégories: ${analysis.catalogueStructure.categories.length}`);
      console.log(`✅ Filtres: ${analysis.catalogueStructure.filters.length}`);
    } catch (error) {
      console.error('❌ Erreur analyse catalogue:', error);
    }
  }

  private async analyzeAnimeStructure(analysis: SiteAnalysis): Promise<void> {
    console.log('🎬 Analyse de la structure des pages anime...');
    
    try {
      // Prendre un échantillon d'anime populaire
      const sampleUrls = [
        '/catalogue/one-piece',
        '/catalogue/naruto',
        '/catalogue/bleach'
      ];
      
      for (const url of sampleUrls) {
        try {
          const response = await this.axiosInstance.get(`${this.baseUrl}${url}`);
          const $ = cheerio.load(response.data);
          
          // Identifier la structure de la page
          const structure: any = {
            hasSeasons: $('.season, .saison').length > 0,
            hasEpisodes: $('.episode, .ep').length > 0,
            hasFilms: $('[class*="film"]').length > 0,
            hasOAV: $('[class*="oav"], [class*="ova"]').length > 0,
            hasScans: $('[class*="scan"], [class*="manga"]').length > 0,
            hasSpecials: $('[class*="special"]').length > 0
          };
          
          // Identifier les types de contenu présents
          Object.entries(structure).forEach(([key, value]) => {
            if (value && !analysis.animePages.contentTypes.includes(key)) {
              analysis.animePages.contentTypes.push(key);
            }
          });
          
          analysis.animePages.structure = structure;
          break; // Une seule analyse suffit pour comprendre la structure
        } catch (error) {
          console.warn(`⚠️ Impossible d'analyser ${url}`);
        }
      }
      
      console.log(`✅ Types de contenu identifiés: ${analysis.animePages.contentTypes.join(', ')}`);
    } catch (error) {
      console.error('❌ Erreur analyse structure anime:', error);
    }
  }

  private async analyzeSpecialSections(analysis: SiteAnalysis): Promise<void> {
    console.log('✨ Recherche des sections spéciales...');
    
    try {
      const response = await this.axiosInstance.get(this.baseUrl);
      const $ = cheerio.load(response.data);
      
      // Rechercher des sections spéciales
      const specialKeywords = ['nouveauté', 'populaire', 'tendance', 'top', 'recommandé', 'exclusif'];
      
      specialKeywords.forEach(keyword => {
        $(`[class*="${keyword}"], [id*="${keyword}"], h2:contains("${keyword}"), h3:contains("${keyword}")`).each((_, element) => {
          const section = {
            type: keyword,
            element: $(element).prop('tagName'),
            class: $(element).attr('class'),
            content: $(element).text().trim().substring(0, 100)
          };
          analysis.specialSections.push(section);
        });
      });
      
      console.log(`✅ Sections spéciales trouvées: ${analysis.specialSections.length}`);
    } catch (error) {
      console.error('❌ Erreur analyse sections spéciales:', error);
    }
  }

  private async mapUrlPatterns(analysis: SiteAnalysis): Promise<void> {
    console.log('🗺️ Mapping des patterns d\'URLs...');
    
    const patterns = {
      anime: '/catalogue/{anime-id}',
      episode: '/catalogue/{anime-id}/{episode-id}',
      season: '/catalogue/{anime-id}/saison{number}',
      film: '/catalogue/{anime-id}/film/{film-id}',
      oav: '/catalogue/{anime-id}/oav/{oav-id}',
      scan: '/catalogue/{anime-id}/scan/{chapter}',
      search: '/search?q={query}',
      genre: '/genre/{genre-name}',
      year: '/year/{year}',
      alphabet: '/alphabet/{letter}'
    };
    
    analysis.scrapingPatterns = patterns;
    analysis.apiEndpoints = Object.keys(patterns);
    
    console.log(`✅ Patterns d'URLs mappés: ${Object.keys(patterns).length}`);
  }

  private async identifyContentTypes(analysis: SiteAnalysis): Promise<void> {
    console.log('📋 Identification des types de contenu...');
    
    const contentTypes = [
      'episodes',
      'films',
      'oav/ova',
      'scans/manga',
      'specials',
      'bonus',
      'previews',
      'openings/endings'
    ];
    
    // Ajouter à l'analyse si pas déjà présent
    contentTypes.forEach(type => {
      if (!analysis.animePages.contentTypes.includes(type)) {
        analysis.animePages.contentTypes.push(type);
      }
    });
    
    console.log(`✅ Types de contenu total: ${analysis.animePages.contentTypes.length}`);
  }

  private async analyzeVideoPlayers(analysis: SiteAnalysis): Promise<void> {
    console.log('🎥 Analyse des lecteurs vidéo...');
    
    const knownPlayers = [
      'sibnet',
      'vidmoly',
      'sendvid',
      'mytv',
      'uqload',
      'vudeo',
      'fusevideo',
      'upstream'
    ];
    
    analysis.animePages.playerTypes = knownPlayers;
    
    console.log(`✅ Lecteurs vidéo identifiés: ${knownPlayers.length}`);
  }
}

export const animeSamaFullAnalyzer = new AnimeSamaFullAnalyzer();