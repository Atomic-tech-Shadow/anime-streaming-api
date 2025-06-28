import axios, { AxiosInstance } from 'axios';

const BASE_URL = 'https://anime-sama.fr';

interface UniversalSeason {
  number: number;
  name: string;
  sectionPath: string;
  url: string;
  episodeCount: number;
  languages: string[];
  actualEpisodesJs?: string[];
}

interface UniversalAnimeStructure {
  animeId: string;
  title: string;
  totalEpisodes: number;
  seasons: UniversalSeason[];
  detectedSections: string[];
  episodeMapping: { [episodeNumber: number]: { season: number; sectionPath: string; index: number } };
}

/**
 * Analyseur universel qui découvre automatiquement la structure de n'importe quel anime
 * sur anime-sama.fr en analysant les vrais fichiers episodes.js
 */
export class UniversalAnimeAnalyzer {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
  }

  /**
   * Analyse complète d'un anime pour découvrir sa vraie structure
   */
  public async analyzeAnimeStructure(animeId: string): Promise<UniversalAnimeStructure> {
    console.log(`🔍 Analyse universelle: ${animeId}`);
    
    try {
      // 1. Récupérer la page principale de l'anime
      const animeUrl = `${BASE_URL}/catalogue/${animeId}/`;
      console.log(`🌐 Récupération: ${animeUrl}`);
      const response = await this.axiosInstance.get(animeUrl);
      console.log(`📄 Statut HTTP: ${response.status}, Taille: ${response.data.length} caractères`);
      
      const cleanedData = response.data.replace(/\s+/g, ' ').trim();
      console.log(`🧹 Après nettoyage: ${cleanedData.length} caractères`);
      
      // 2. Extraire le titre
      const { load } = await import('cheerio');
      const $ = load(response.data);
      const title = $('h1, .anime-title').first().text().trim() || 
                   animeId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
      
      // 3. Détecter toutes les sections via panneauAnime
      const allSections = this.extractAllSections(cleanedData);
      const filteredSections = allSections.filter(section => 
        section.name !== 'nom' && section.path !== 'url' && 
        section.path.includes('/') && !section.path.includes('{{')
      );
      console.log(`📂 Sections détectées: ${filteredSections.length} (${allSections.length} total)`);
      
      // 4. Analyser chaque section pour compter les vrais épisodes
      const seasons = await this.analyzeAllSections(animeId, filteredSections);
      
      // 5. Créer le mapping épisode->saison
      const episodeMapping = this.createEpisodeMapping(seasons);
      
      // 6. Calculer le total d'épisodes
      const totalEpisodes = seasons.reduce((total, season) => total + season.episodeCount, 0);
      
      console.log(`✅ Structure détectée: ${seasons.length} saisons, ${totalEpisodes} épisodes`);
      
      return {
        animeId,
        title,
        totalEpisodes,
        seasons,
        detectedSections: allSections.map(s => s.name),
        episodeMapping
      };
    } catch (error) {
      console.error(`❌ Erreur analyse ${animeId}:`, error);
      return {
        animeId,
        title: animeId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
        totalEpisodes: 0,
        seasons: [],
        detectedSections: [],
        episodeMapping: {}
      };
    }
  }

  /**
   * Extrait toutes les sections depuis les appels panneauAnime
   */
  private extractAllSections(htmlContent: string): Array<{name: string, path: string}> {
    const sections: Array<{name: string, path: string}> = [];
    
    // Pattern pour détecter les appels panneauAnime
    const panneauPattern = /panneauAnime\s*\(\s*['"](.*?)['"],\s*['"](.*?)[']\)/g;
    let match;
    let matchCount = 0;
    
    while ((match = panneauPattern.exec(htmlContent)) !== null && matchCount < 10) {
      const name = match[1];
      const path = match[2];
      
      if (name && path && name !== 'nom' && path !== 'url') {
        sections.push({ name, path });
      }
      matchCount++;
    }
    
    console.log(`🔍 Raw matches trouvés: ${matchCount}`);
    console.log(`📋 Premiers matches: ${htmlContent.match(panneauPattern)?.slice(0, 3).join(', ') || 'aucun'}`);
    
    return sections;
  }

  /**
   * Analyse toutes les sections pour compter les vrais épisodes
   */
  private async analyzeAllSections(animeId: string, sections: Array<{name: string, path: string}>): Promise<UniversalSeason[]> {
    const seasons: UniversalSeason[] = [];
    
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      console.log(`📺 Analyse section: ${section.name} (${section.path})`);
      
      try {
        // Analyser cette section (sans suffixe de langue pour l'URL de base)
        const sectionUrl = `${BASE_URL}/catalogue/${animeId}/${section.path.replace(/\/(vf|vostfr)$/, '')}`;
        
        try {
          await new Promise(resolve => setTimeout(resolve, 500));
          const sectionResponse = await this.axiosInstance.get(sectionUrl);
            
          if (sectionResponse.status === 200) {
            const episodeCount = await this.countRealEpisodes(sectionUrl);
            
            if (episodeCount > 0) {
              // Créer nouvelle saison
              seasons.push({
                number: seasons.length + 1,
                name: section.name,
                sectionPath: section.path.replace(/\/(vf|vostfr)$/, ''),
                url: sectionUrl,
                episodeCount,
                languages: ['VF', 'VOSTFR'] // Supposer les deux langues disponibles
              });
              
              console.log(`✅ ${section.name}: ${episodeCount} épisodes`);
            }
          }
        } catch (error) {
          console.log(`❌ Erreur section ${section.name}: ${error}`);
        }
        
      } catch (error) {
        console.log(`❌ Impossible d'analyser: ${section.name}`);
      }
    }
    
    return seasons.sort((a, b) => a.number - b.number);
  }

  /**
   * Compte le vrai nombre d'épisodes en analysant episodes.js
   */
  private async countRealEpisodes(sectionUrl: string): Promise<number> {
    console.log(`📊 Comptage épisodes: ${sectionUrl}`);
    try {
      // Récupérer la page de la section
      const response = await this.axiosInstance.get(sectionUrl);
      console.log(`📄 Section statut: ${response.status}`);
      const episodesJsMatch = response.data.match(/episodes\.js\?filever=(\d+)/);
      console.log(`🔍 episodes.js détecté: ${!!episodesJsMatch}`);
      
      if (episodesJsMatch) {
        const filever = episodesJsMatch[1];
        const episodesJsUrl = `${sectionUrl}/episodes.js?filever=${filever}`;
        
        try {
          await new Promise(resolve => setTimeout(resolve, 300));
          const episodesResponse = await this.axiosInstance.get(episodesJsUrl);
          
          if (episodesResponse.data) {
            // Compter les épisodes dans chaque array eps1, eps2, etc.
            const content = episodesResponse.data;
            let maxEpisodeCount = 0;
            
            // Rechercher tous les arrays eps1, eps2, etc.
            const epsArrayMatches = content.match(/eps\d+\s*=\s*\[[^\]]+\]/g);
            if (epsArrayMatches) {
              for (const arrayMatch of epsArrayMatches) {
                const urls = arrayMatch.match(/["'][^"']+["']/g);
                if (urls) {
                  maxEpisodeCount += urls.length;
                }
              }
            }
            
            console.log(`📊 Episodes trouvés: ${maxEpisodeCount}`);
            return maxEpisodeCount;
          }
        } catch (error) {
          console.log(`❌ Erreur episodes.js: ${error}`);
        }
      }
      
      return 0;
    } catch (error) {
      console.log(`❌ Erreur comptage: ${error}`);
      return 0;
    }
  }

  /**
   * Crée le mapping épisode->saison
   */
  private createEpisodeMapping(seasons: UniversalSeason[]): { [episodeNumber: number]: { season: number; sectionPath: string; index: number } } {
    const mapping: { [episodeNumber: number]: { season: number; sectionPath: string; index: number } } = {};
    let currentEpisode = 1;
    
    for (const season of seasons) {
      for (let i = 0; i < season.episodeCount; i++) {
        mapping[currentEpisode] = {
          season: season.number,
          sectionPath: season.sectionPath,
          index: i
        };
        currentEpisode++;
      }
    }
    
    return mapping;
  }

  /**
   * Trouve la saison correspondant à un numéro d'épisode
   */
  public findSeasonForEpisode(episodeNumber: number, structure: UniversalAnimeStructure): { season: UniversalSeason; sectionPath: string; episodeIndex: number } | null {
    const mapping = structure.episodeMapping[episodeNumber];
    if (!mapping) return null;
    
    const season = structure.seasons.find(s => s.number === mapping.season);
    if (!season) return null;
    
    return {
      season,
      sectionPath: mapping.sectionPath,
      episodeIndex: mapping.index
    };
  }
}

export const universalAnimeAnalyzer = new UniversalAnimeAnalyzer();