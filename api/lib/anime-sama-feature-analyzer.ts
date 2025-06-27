import * as cheerio from 'cheerio';
import {
  createAxiosInstance,
  randomDelay,
  BASE_URL
} from './core.js';

/**
 * Analyseur complet des fonctionnalités d'anime-sama.fr
 * Détecte automatiquement toutes les sections et types de contenu
 */
export class AnimeSamaFeatureAnalyzer {
  private axiosInstance = createAxiosInstance();
  
  /**
   * Analyse complète du site anime-sama.fr pour identifier toutes les fonctionnalités
   */
  public async analyzeCompleteFeatures(): Promise<any> {
    console.log('🔍 Starting complete feature analysis of anime-sama.fr...');
    
    const analysis = {
      contentTypes: new Set<string>(),
      languages: new Set<string>(),
      sections: new Set<string>(),
      urlPatterns: new Set<string>(),
      specialFeatures: new Set<string>(),
      navigationStructure: {},
      episodePatterns: new Set<string>(),
      contentCategories: new Set<string>()
    };

    try {
      // 1. Analyser la page d'accueil
      await this.analyzeHomePage(analysis);
      
      // 2. Analyser la navigation
      await this.analyzeNavigation(analysis);
      
      // 3. Analyser les patterns d'URLs
      await this.analyzeUrlPatterns(analysis);
      
      // 4. Analyser les types de contenu
      await this.analyzeContentTypes(analysis);
      
      // 5. Analyser les langues supportées
      await this.analyzeLanguages(analysis);
      
      // 6. Analyser les sections spéciales
      await this.analyzeSpecialSections(analysis);
      
      // 7. Analyser la structure des épisodes
      await this.analyzeEpisodeStructure(analysis);
      
      const result = {
        contentTypes: Array.from(analysis.contentTypes),
        languages: Array.from(analysis.languages),
        sections: Array.from(analysis.sections),
        urlPatterns: Array.from(analysis.urlPatterns),
        specialFeatures: Array.from(analysis.specialFeatures),
        navigationStructure: analysis.navigationStructure,
        episodePatterns: Array.from(analysis.episodePatterns),
        contentCategories: Array.from(analysis.contentCategories),
        analysisTimestamp: new Date().toISOString()
      };
      
      console.log('✅ Feature analysis complete:');
      console.log(`📺 Content types: ${result.contentTypes.length}`);
      console.log(`🗣️ Languages: ${result.languages.length}`);
      console.log(`📂 Sections: ${result.sections.length}`);
      console.log(`🔗 URL patterns: ${result.urlPatterns.length}`);
      console.log(`⭐ Special features: ${result.specialFeatures.length}`);
      
      return result;
      
    } catch (error: any) {
      console.error('Error during feature analysis:', error);
      return analysis;
    }
  }

  /**
   * Analyser la page d'accueil
   */
  private async analyzeHomePage(analysis: any): Promise<void> {
    try {
      console.log('📍 Analyzing home page structure...');
      await randomDelay(500, 1000);
      
      const response = await this.axiosInstance.get('/');
      const $ = cheerio.load(response.data);
      
      // Analyser tous les liens pour identifier les patterns
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href') || '';
        
        if (href.includes('anime-sama.fr')) {
          // Extraire les patterns d'URLs
          if (href.includes('/catalogue/')) {
            if (href.includes('/saison')) analysis.urlPatterns.add('saison');
            if (href.includes('/film')) analysis.urlPatterns.add('film');
            if (href.includes('/oav')) analysis.urlPatterns.add('oav');
            if (href.includes('/scan')) analysis.urlPatterns.add('scan');
            if (href.includes('/special')) analysis.urlPatterns.add('special');
            
            // Extraire les langues
            if (href.includes('/vf/')) analysis.languages.add('VF');
            if (href.includes('/vostfr/')) analysis.languages.add('VOSTFR');
            if (href.includes('/vj/')) analysis.languages.add('VJ');
          }
        }
      });
      
      // Analyser les éléments de navigation
      $('nav, .nav, [class*="nav"]').each((_, el) => {
        const navText = $(el).text().toLowerCase();
        if (navText.includes('film')) analysis.contentTypes.add('films');
        if (navText.includes('série')) analysis.contentTypes.add('series');
        if (navText.includes('oav')) analysis.contentTypes.add('oav');
        if (navText.includes('scan')) analysis.contentTypes.add('scans');
      });
      
      // Analyser les sections visibles
      $('[class*="section"], .container, .content').each((_, el) => {
        const sectionContent = $(el).text().toLowerCase();
        if (sectionContent.includes('populaire')) analysis.sections.add('populaires');
        if (sectionContent.includes('récent')) analysis.sections.add('recents');
        if (sectionContent.includes('tendance')) analysis.sections.add('tendances');
        if (sectionContent.includes('nouveau')) analysis.sections.add('nouveautes');
      });
      
    } catch (error) {
      console.error('Error analyzing home page:', error);
    }
  }

  /**
   * Analyser la structure de navigation
   */
  private async analyzeNavigation(analysis: any): Promise<void> {
    try {
      console.log('🧭 Analyzing navigation structure...');
      
      const response = await this.axiosInstance.get('/');
      const $ = cheerio.load(response.data);
      
      const navigation: any = {};
      
      // Analyser les menus principaux
      $('nav a, .nav a, [class*="menu"] a').each((_, el) => {
        const href = $(el).attr('href') || '';
        const text = $(el).text().trim();
        
        if (href && text) {
          if (href.includes('catalogue')) navigation.catalogue = href;
          if (href.includes('genre')) navigation.genres = href;
          if (href.includes('recherche') || href.includes('search')) navigation.search = href;
          if (text.toLowerCase().includes('film')) navigation.films = href;
          if (text.toLowerCase().includes('oav')) navigation.oav = href;
        }
      });
      
      analysis.navigationStructure = navigation;
      
    } catch (error) {
      console.error('Error analyzing navigation:', error);
    }
  }

  /**
   * Analyser tous les patterns d'URLs
   */
  private async analyzeUrlPatterns(analysis: any): Promise<void> {
    try {
      console.log('🔗 Analyzing URL patterns...');
      
      const response = await this.axiosInstance.get('/');
      const content = response.data;
      
      // Regex pour capturer tous les patterns d'URLs anime-sama
      const urlPatterns = [
        /\/catalogue\/([^\/\s"']+)\/saison(\d+)\/([^\/\s"']+)\//g,
        /\/catalogue\/([^\/\s"']+)\/film\/([^\/\s"']+)\//g,
        /\/catalogue\/([^\/\s"']+)\/oav\/([^\/\s"']+)\//g,
        /\/catalogue\/([^\/\s"']+)\/scan\/([^\/\s"']+)\//g,
        /\/catalogue\/([^\/\s"']+)\/special\/([^\/\s"']+)\//g,
        /\/episode\/([^\/\s"']+)\//g,
        /\/lecteur\/([^\/\s"']+)\//g
      ];
      
      urlPatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          if (pattern.source.includes('saison')) {
            analysis.urlPatterns.add('saison-structure');
            analysis.contentTypes.add('series');
          }
          if (pattern.source.includes('film')) {
            analysis.urlPatterns.add('film-structure');
            analysis.contentTypes.add('films');
          }
          if (pattern.source.includes('oav')) {
            analysis.urlPatterns.add('oav-structure');
            analysis.contentTypes.add('oav');
          }
          if (pattern.source.includes('scan')) {
            analysis.urlPatterns.add('scan-structure');
            analysis.contentTypes.add('scans');
          }
          if (pattern.source.includes('episode')) {
            analysis.urlPatterns.add('episode-structure');
          }
        }
      });
      
    } catch (error) {
      console.error('Error analyzing URL patterns:', error);
    }
  }

  /**
   * Analyser les types de contenu
   */
  private async analyzeContentTypes(analysis: any): Promise<void> {
    try {
      console.log('📺 Analyzing content types...');
      
      // Tester des URLs spécifiques pour identifier les types de contenu
      const testUrls = [
        '/catalogue/',
        '/films/',
        '/oav/',
        '/scans/'
      ];
      
      for (const url of testUrls) {
        try {
          await randomDelay(300, 600);
          const response = await this.axiosInstance.get(url);
          
          if (response.status === 200) {
            const $ = cheerio.load(response.data);
            
            // Identifier le type de contenu
            const urlType = url.replace(/\//g, '').toLowerCase();
            if (urlType) analysis.sections.add(urlType);
            
            // Analyser les éléments spécifiques à chaque type
            $('a[href*="/catalogue/"]').each((_, el) => {
              const href = $(el).attr('href') || '';
              
              if (href.includes('/film/')) analysis.contentTypes.add('films');
              if (href.includes('/saison')) analysis.contentTypes.add('series');
              if (href.includes('/oav/')) analysis.contentTypes.add('oav');
              if (href.includes('/scan/')) analysis.contentTypes.add('scans');
            });
          }
        } catch (err) {
          // URL n'existe pas, continuer
        }
      }
      
    } catch (error) {
      console.error('Error analyzing content types:', error);
    }
  }

  /**
   * Analyser les langues supportées
   */
  private async analyzeLanguages(analysis: any): Promise<void> {
    try {
      console.log('🗣️ Analyzing supported languages...');
      
      const response = await this.axiosInstance.get('/');
      const content = response.data;
      
      // Chercher tous les patterns de langues
      const languagePatterns = [
        /\/vf\//gi,
        /\/vostfr\//gi,
        /\/vj\//gi,
        /\/vo\//gi,
        /\/french\//gi,
        /\/english\//gi,
        /\/japanese\//gi
      ];
      
      languagePatterns.forEach(pattern => {
        if (pattern.test(content)) {
          const lang = pattern.source.replace(/[\/\\gi]/g, '').toUpperCase();
          analysis.languages.add(lang);
        }
      });
      
      // Ajouter les langues standard si détectées
      if (content.includes('français') || content.includes('vf')) analysis.languages.add('VF');
      if (content.includes('sous-titr') || content.includes('vostfr')) analysis.languages.add('VOSTFR');
      if (content.includes('japonais') || content.includes('vj')) analysis.languages.add('VJ');
      
    } catch (error) {
      console.error('Error analyzing languages:', error);
    }
  }

  /**
   * Analyser les sections spéciales
   */
  private async analyzeSpecialSections(analysis: any): Promise<void> {
    try {
      console.log('⭐ Analyzing special sections...');
      
      const specialSections = [
        '/top/',
        '/populaire/',
        '/trending/',
        '/nouveaute/',
        '/genre/',
        '/random/',
        '/recent/'
      ];
      
      for (const section of specialSections) {
        try {
          await randomDelay(200, 400);
          const response = await this.axiosInstance.get(section);
          
          if (response.status === 200) {
            const sectionName = section.replace(/\//g, '');
            analysis.specialFeatures.add(sectionName);
            analysis.sections.add(sectionName);
          }
        } catch (err) {
          // Section n'existe pas
        }
      }
      
    } catch (error) {
      console.error('Error analyzing special sections:', error);
    }
  }

  /**
   * Analyser la structure des épisodes
   */
  private async analyzeEpisodeStructure(analysis: any): Promise<void> {
    try {
      console.log('📹 Analyzing episode structure...');
      
      const response = await this.axiosInstance.get('/');
      const content = response.data;
      
      // Patterns d'épisodes
      const episodePatterns = [
        /episode-(\d+)/gi,
        /ep(\d+)/gi,
        /saison(\d+)\/episode(\d+)/gi,
        /s(\d+)e(\d+)/gi
      ];
      
      episodePatterns.forEach(pattern => {
        if (pattern.test(content)) {
          analysis.episodePatterns.add(pattern.source);
        }
      });
      
      // Détecter les serveurs de streaming
      const streamingPatterns = [
        /sibnet/gi,
        /sendvid/gi,
        /streamtape/gi,
        /doodstream/gi,
        /mixdrop/gi,
        /upstream/gi
      ];
      
      streamingPatterns.forEach(pattern => {
        if (pattern.test(content)) {
          analysis.specialFeatures.add('streaming-' + pattern.source.replace(/[\/\\gi]/g, ''));
        }
      });
      
    } catch (error) {
      console.error('Error analyzing episode structure:', error);
    }
  }
}

export const animeSamaFeatureAnalyzer = new AnimeSamaFeatureAnalyzer();