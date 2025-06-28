/**
 * Système intelligent de détection automatique des animes sur anime-sama.fr
 * Détecte automatiquement les IDs, structures et langues disponibles
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { createAxiosInstance } from './core';

export interface AnimeMatch {
  id: string;
  title: string;
  url: string;
  score: number;
  availableLanguages: string[];
  availableTypes: string[];
  structure: AnimeStructure;
}

export interface AnimeStructure {
  hasSeasons: boolean;
  seasonCount: number;
  seasons: SeasonStructure[];
  hasFilms: boolean;
  hasOAV: boolean;
  hasScans: boolean;
}

export interface SeasonStructure {
  number: number;
  name: string;
  path: string;
  languages: string[];
  episodeCount: number;
}

export class IntelligentAnimeDetector {
  private axiosInstance = createAxiosInstance();
  private baseUrl = 'https://anime-sama.fr';
  private catalogueCache: Map<string, AnimeMatch> = new Map();
  private lastCacheUpdate = 0;
  private cacheExpiry = 300000; // 5 minutes

  /**
   * Détecte automatiquement un anime à partir d'un nom approximatif
   */
  public async detectAnime(searchTerm: string): Promise<AnimeMatch | null> {
    console.log(`🔍 Détection intelligente pour: "${searchTerm}"`);
    
    // Charger le catalogue si nécessaire
    await this.loadCatalogue();
    
    // Recherche par similarité
    const matches = this.findSimilarAnimes(searchTerm);
    
    if (matches.length === 0) {
      console.log(`❌ Aucun anime trouvé pour "${searchTerm}"`);
      return null;
    }
    
    // Prendre le meilleur match
    const bestMatch = matches[0];
    console.log(`✅ Meilleur match: "${bestMatch.title}" (score: ${bestMatch.score})`);
    
    // Analyser la structure complète
    await this.analyzeAnimeStructure(bestMatch);
    
    return bestMatch;
  }

  /**
   * Charge et analyse le catalogue complet
   */
  private async loadCatalogue(): Promise<void> {
    const now = Date.now();
    if (this.catalogueCache.size > 0 && (now - this.lastCacheUpdate) < this.cacheExpiry) {
      console.log(`📦 Utilisation du cache catalogue (${this.catalogueCache.size} animes)`);
      return;
    }

    console.log(`🔄 Chargement du catalogue anime-sama.fr...`);
    
    try {
      const response = await this.axiosInstance.get(`${this.baseUrl}/catalogue/`);
      const $ = cheerio.load(response.data);
      
      this.catalogueCache.clear();
      
      // Parser tous les liens d'animes avec une approche plus robuste
      $('a[href*="/catalogue/"]').each((_, element) => {
        const $el = $(element);
        const href = $el.attr('href');
        
        if (href && href !== '/catalogue/' && !href.includes('/catalogue/page/') && !href.endsWith('/catalogue/')) {
          // Chercher le titre dans différents endroits
          let title = $el.find('strong').first().text().trim();
          if (!title) title = $el.find('h2, h3, h4').first().text().trim();
          if (!title) title = $el.attr('title') || '';
          
          // Nettoyer le titre
          title = title.replace(/^\*\*/, '').replace(/\*\*$/, '').trim();
          
          if (title && title.length > 1) {
            const id = this.extractAnimeId(href);
            const fullText = $el.text();
            const types = this.extractContentTypes($el);
            const languages = this.extractLanguages($el);
            
            if (id && title) {
              const match: AnimeMatch = {
                id,
                title,
                url: href.startsWith('http') ? href : `${this.baseUrl}${href}`,
                score: 0,
                availableLanguages: languages,
                availableTypes: types,
                structure: {
                  hasSeasons: false,
                  seasonCount: 0,
                  seasons: [],
                  hasFilms: types.includes('Film'),
                  hasOAV: types.includes('OAV'),
                  hasScans: types.includes('Scans')
                }
              };
              
              this.catalogueCache.set(id.toLowerCase(), match);
              console.log(`📁 Détecté: "${title}" (${id}) - ${types.join(', ')} - ${languages.join(', ')}`);
            }
          }
        }
      });
      
      this.lastCacheUpdate = now;
      console.log(`✅ Catalogue chargé: ${this.catalogueCache.size} animes détectés`);
      
    } catch (error) {
      console.error(`❌ Erreur chargement catalogue:`, error);
    }
  }

  /**
   * Trouve les animes similaires par nom
   */
  private findSimilarAnimes(searchTerm: string): AnimeMatch[] {
    const normalized = this.normalizeSearchTerm(searchTerm);
    const matches: AnimeMatch[] = [];
    
    for (const anime of this.catalogueCache.values()) {
      const score = this.calculateSimilarity(normalized, anime);
      if (score > 0.3) { // Seuil minimum de similarité
        anime.score = score;
        matches.push(anime);
      }
    }
    
    // Trier par score décroissant
    return matches.sort((a, b) => b.score - a.score);
  }

  /**
   * Calcule la similarité entre le terme recherché et un anime
   */
  private calculateSimilarity(searchTerm: string, anime: AnimeMatch): number {
    const targets = [
      anime.title.toLowerCase(),
      anime.id.toLowerCase(),
      ...anime.title.toLowerCase().split(/[^a-z0-9]+/)
    ];
    
    let maxScore = 0;
    
    for (const target of targets) {
      // Score exact
      if (target === searchTerm) return 1.0;
      
      // Score par inclusion
      if (target.includes(searchTerm) || searchTerm.includes(target)) {
        const score = Math.min(searchTerm.length, target.length) / Math.max(searchTerm.length, target.length);
        maxScore = Math.max(maxScore, score * 0.8);
      }
      
      // Score Levenshtein simplifié
      const distance = this.levenshteinDistance(searchTerm, target);
      const score = 1 - (distance / Math.max(searchTerm.length, target.length));
      if (score > 0.6) {
        maxScore = Math.max(maxScore, score * 0.7);
      }
    }
    
    return maxScore;
  }

  /**
   * Analyse la structure complète d'un anime
   */
  private async analyzeAnimeStructure(anime: AnimeMatch): Promise<void> {
    console.log(`🔍 Analyse structure: ${anime.title}`);
    
    try {
      const response = await this.axiosInstance.get(anime.url);
      const $ = cheerio.load(response.data);
      
      // Détecter les saisons/sections disponibles
      const seasons: SeasonStructure[] = [];
      const links = $('a[href]');
      
      links.each((_, element) => {
        const href = $(element).attr('href');
        if (href && href.includes(anime.id)) {
          const seasonMatch = href.match(/\/(saison\d+|saga\d+|kai|film|oav)/i);
          if (seasonMatch) {
            const langMatch = href.match(/\/(vf|vostfr|vastfr)$/i);
            if (langMatch) {
              const seasonName = seasonMatch[1];
              const language = langMatch[1].toUpperCase();
              
              let season = seasons.find(s => s.name === seasonName);
              if (!season) {
                season = {
                  number: this.extractSeasonNumber(seasonName),
                  name: seasonName,
                  path: href,
                  languages: [],
                  episodeCount: 0
                };
                seasons.push(season);
              }
              
              if (!season.languages.includes(language)) {
                season.languages.push(language);
              }
            }
          }
        }
      });
      
      // Mettre à jour la structure
      anime.structure.hasSeasons = seasons.length > 0;
      anime.structure.seasonCount = seasons.length;
      anime.structure.seasons = seasons.sort((a, b) => a.number - b.number);
      
      console.log(`✅ Structure analysée: ${seasons.length} saisons détectées`);
      
    } catch (error) {
      console.error(`❌ Erreur analyse structure:`, error);
    }
  }

  /**
   * Utilitaires de parsing
   */
  private extractAnimeId(href: string): string {
    const match = href.match(/\/catalogue\/([^\/]+)/);
    return match ? match[1] : '';
  }

  private extractContentTypes($element: cheerio.Cheerio<any>): string[] {
    const text = $element.text().toLowerCase();
    const types: string[] = [];
    
    if (text.includes('anime')) types.push('Anime');
    if (text.includes('film')) types.push('Film');
    if (text.includes('scans')) types.push('Scans');
    if (text.includes('oav')) types.push('OAV');
    
    return types;
  }

  private extractLanguages($element: cheerio.Cheerio<any>): string[] {
    const text = $element.text().toUpperCase();
    const languages: string[] = [];
    
    if (text.includes('VOSTFR')) languages.push('VOSTFR');
    if (text.includes('VF')) languages.push('VF');
    if (text.includes('VASTFR')) languages.push('VASTFR');
    
    return languages;
  }

  private normalizeSearchTerm(term: string): string {
    return term.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private extractSeasonNumber(seasonName: string): number {
    const match = seasonName.match(/(\d+)/);
    return match ? parseInt(match[1]) : 1;
  }

  private levenshteinDistance(a: string, b: string): number {
    const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
    
    for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= b.length; j++) {
      for (let i = 1; i <= a.length; i++) {
        const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    return matrix[b.length][a.length];
  }
}

export const intelligentAnimeDetector = new IntelligentAnimeDetector();