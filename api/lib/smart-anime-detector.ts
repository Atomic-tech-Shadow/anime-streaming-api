/**
 * Détecteur intelligent d'animes - approche pragmatique
 * Teste directement les URLs possibles au lieu de parser le catalogue
 */

import { createAxiosInstance } from './core';

export interface SmartAnimeResult {
  id: string;
  originalName: string;
  detectedUrl: string;
  confidence: number;
}

export class SmartAnimeDetector {
  private axiosInstance = createAxiosInstance();
  private baseUrl = 'https://anime-sama.fr';
  
  /**
   * Base de données des patterns d'animes populaires
   */
  private animePatterns: { [key: string]: string[] } = {
    'attack-on-titan': ['shingeki-no-kyojin', 'attack-on-titan', 'aot'],
    'demon-slayer': ['demon-slayer', 'kimetsu-no-yaiba', 'kny'],
    'one-piece': ['one-piece', 'onepiece'],
    'naruto': ['naruto', 'naruto-shippuden'],
    'my-hero-academia': ['my-hero-academia', 'boku-no-hero-academia', 'bnha', 'mha'],
    'jujutsu-kaisen': ['jujutsu-kaisen', 'jjk'],
    'chainsaw-man': ['chainsaw-man', 'chainsawman'],
    'tokyo-ghoul': ['tokyo-ghoul', 'tokyoghoul'],
    'death-note': ['death-note', 'deathnote'],
    'one-punch-man': ['one-punch-man', 'onepunchman', 'opm'],
    'hunter-x-hunter': ['hunter-x-hunter', 'hunterxhunter', 'hxh'],
    'bleach': ['bleach'],
    'dragon-ball': ['dragon-ball', 'dragonball', 'dbz', 'dragon-ball-z'],
    'fullmetal-alchemist': ['fullmetal-alchemist', 'fma'],
    'mob-psycho': ['mob-psycho', 'mob-psycho-100'],
    'spy-family': ['spy-x-family', 'spy-family', 'spyfamily'],
    'overlord': ['overlord'],
    'black-clover': ['black-clover', 'blackclover'],
    'fairy-tail': ['fairy-tail', 'fairytail'],
    'violet-evergarden': ['violet-evergarden'],
    'your-name': ['your-name', 'kimi-no-na-wa'],
    'spirited-away': ['spirited-away', 'chihiro'],
    'akira': ['akira'],
    'pokemon': ['pokemon', 'pocket-monsters'],
    'sailor-moon': ['sailor-moon', 'sailormoon'],
    'evangelion': ['evangelion', 'neon-genesis-evangelion'],
    'cowboy-bebop': ['cowboy-bebop'],
    'code-geass': ['code-geass'],
    'steins-gate': ['steins-gate'],
    'rezero': ['re-zero', 'rezero'],
    'konosuba': ['konosuba'],
    'no-game-no-life': ['no-game-no-life'],
    'seven-deadly-sins': ['seven-deadly-sins', 'nanatsu-no-taizai'],
    'food-wars': ['food-wars', 'shokugeki-no-soma'],
    'haikyuu': ['haikyuu', 'haikyu'],
    'kuroko-basket': ['kuroko-no-basket', 'kuroko-basket'],
    'one-piece-film': ['one-piece-red', 'one-piece-stampede'],
    'silent-voice': ['a-silent-voice', 'koe-no-katachi'],
    'weathering-with-you': ['weathering-with-you', 'tenki-no-ko']
  };

  /**
   * Détecte automatiquement l'anime en testant les URLs possibles
   */
  public async detectAnime(searchTerm: string): Promise<SmartAnimeResult | null> {
    console.log(`🎯 Détection intelligente: "${searchTerm}"`);
    
    // Normaliser le terme de recherche
    const normalized = this.normalizeSearchTerm(searchTerm);
    
    // Générer toutes les variantes possibles
    const candidates = this.generateCandidates(normalized);
    
    console.log(`🔍 Testing ${candidates.length} candidates: ${candidates.slice(0, 5).join(', ')}...`);
    
    // Tester chaque candidat
    for (const candidate of candidates) {
      const result = await this.testAnimeUrl(candidate, searchTerm);
      if (result) {
        console.log(`✅ Match trouvé: "${searchTerm}" → "${candidate}"`);
        return result;
      }
    }
    
    console.log(`❌ Aucun match trouvé pour "${searchTerm}"`);
    return null;
  }

  /**
   * Génère toutes les variantes possibles d'un nom d'anime
   */
  private generateCandidates(searchTerm: string): string[] {
    const candidates = new Set<string>();
    
    // 1. Terme exact
    candidates.add(searchTerm);
    
    // 2. Recherche dans les patterns connus
    for (const [key, variants] of Object.entries(this.animePatterns)) {
      if (searchTerm.includes(key.split('-')[0]) || key.includes(searchTerm.split('-')[0])) {
        variants.forEach(v => candidates.add(v));
      }
    }
    
    // 3. Variantes automatiques
    const baseTerm = searchTerm.replace(/-/g, '');
    candidates.add(baseTerm);
    candidates.add(searchTerm.replace(/-/g, ''));
    candidates.add(searchTerm.replace(/\s+/g, '-'));
    
    // 4. Variantes courantes
    if (searchTerm.includes('x')) {
      candidates.add(searchTerm.replace(/x/g, '-'));
      candidates.add(searchTerm.replace(/-x-/g, '-'));
    }
    
    // 5. Ajouts/suppressions courantes
    candidates.add(`${searchTerm}-tv`);
    candidates.add(`${searchTerm}-anime`);
    candidates.add(searchTerm.replace(/-tv$/, ''));
    candidates.add(searchTerm.replace(/-anime$/, ''));
    
    return Array.from(candidates).filter(c => c.length > 0);
  }

  /**
   * Teste si une URL d'anime existe
   */
  private async testAnimeUrl(animeId: string, originalName: string): Promise<SmartAnimeResult | null> {
    const testUrls = [
      `${this.baseUrl}/catalogue/${animeId}/`,
      `${this.baseUrl}/catalogue/${animeId}/saison1/vf/`,
      `${this.baseUrl}/catalogue/${animeId}/saison1/vostfr/`,
      `${this.baseUrl}/catalogue/${animeId}/film/vf/`,
      `${this.baseUrl}/catalogue/${animeId}/film/vostfr/`
    ];
    
    for (const url of testUrls) {
      try {
        const response = await this.axiosInstance.head(url);
        if (response.status === 200) {
          return {
            id: animeId,
            originalName,
            detectedUrl: url,
            confidence: this.calculateConfidence(originalName, animeId)
          };
        }
      } catch (error) {
        // Continue testing
      }
    }
    
    return null;
  }

  /**
   * Calcule la confiance du match
   */
  private calculateConfidence(original: string, detected: string): number {
    if (original === detected) return 1.0;
    
    const normalizedOriginal = this.normalizeSearchTerm(original);
    const normalizedDetected = this.normalizeSearchTerm(detected);
    
    if (normalizedOriginal === normalizedDetected) return 0.9;
    
    // Recherche de mots-clés communs
    const originalWords = normalizedOriginal.split(/[-\s]+/);
    const detectedWords = normalizedDetected.split(/[-\s]+/);
    
    const commonWords = originalWords.filter(word => 
      detectedWords.some(dWord => word.includes(dWord) || dWord.includes(word))
    );
    
    return Math.min(0.8, commonWords.length / Math.max(originalWords.length, detectedWords.length));
  }

  /**
   * Normalise un terme de recherche
   */
  private normalizeSearchTerm(term: string): string {
    return term.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
}

export const smartAnimeDetector = new SmartAnimeDetector();