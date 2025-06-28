/**
 * Mapping automatique des noms d'animes vers leurs identifiants sur anime-sama.fr
 * Basé sur l'exploration directe du site
 */

interface AnimeMapping {
  [key: string]: string;
}

/**
 * Dictionnaire de correspondances anime-sama.fr
 */
export const ANIME_ID_MAPPINGS: AnimeMapping = {
  // Attack on Titan
  'attack-on-titan': 'shingeki-no-kyojin',
  'aot': 'shingeki-no-kyojin',
  'snk': 'shingeki-no-kyojin',
  
  // Demon Slayer
  'demon-slayer': 'demon-slayer',
  'kimetsu-no-yaiba': 'demon-slayer',
  'kny': 'demon-slayer',
  
  // My Hero Academia
  'my-hero-academia': 'my-hero-academia',
  'mha': 'my-hero-academia',
  'boku-no-hero': 'my-hero-academia',
  
  // Jujutsu Kaisen
  'jujutsu-kaisen': 'jujutsu-kaisen',
  'jjk': 'jujutsu-kaisen',
  
  // Chainsaw Man
  'chainsaw-man': 'chainsaw-man',
  'csm': 'chainsaw-man',
  
  // Tokyo Ghoul
  'tokyo-ghoul': 'tokyo-ghoul',
  'tg': 'tokyo-ghoul',
  
  // Hunter x Hunter
  'hunter-x-hunter': 'hunter-x-hunter',
  'hxh': 'hunter-x-hunter',
  
  // Death Note
  'death-note': 'death-note',
  'dn': 'death-note',
  
  // Fullmetal Alchemist
  'fullmetal-alchemist': 'fullmetal-alchemist',
  'fma': 'fullmetal-alchemist',
  'fullmetal-alchemist-brotherhood': 'fullmetal-alchemist-brotherhood',
  'fmab': 'fullmetal-alchemist-brotherhood',
  
  // Dragon Ball
  'dragon-ball': 'dragon-ball',
  'dragon-ball-z': 'dragon-ball-z',
  'dragon-ball-super': 'dragon-ball-super',
  'dbz': 'dragon-ball-z',
  'dbs': 'dragon-ball-super',
  
  // Bleach
  'bleach': 'bleach',
  
  // Mob Psycho 100
  'mob-psycho-100': 'mob-psycho-100',
  'mp100': 'mob-psycho-100',
  
  // Spy x Family
  'spy-x-family': 'spy-x-family',
  'sxf': 'spy-x-family',
  
  // Autres animes populaires
  'akame-ga-kill': 'akame-ga-kill',
  'black-clover': 'black-clover',
  'fire-force': 'fire-force',
  'code-geass': 'code-geass',
  'evangelion': 'neon-genesis-evangelion',
  'cowboy-bebop': 'cowboy-bebop',
  'one-punch-man': 'one-punch-man',
  'violet-evergarden': 'violet-evergarden',
  'your-name': 'kimi-no-na-wa',
  'spirited-away': 'le-voyage-de-chihiro',
  'princess-mononoke': 'princesse-mononoke',
  'totoro': 'mon-voisin-totoro'
};

/**
 * Résout l'identifiant réel d'un anime sur anime-sama.fr
 */
export function resolveAnimeId(inputId: string): string {
  // Nettoyer l'ID d'entrée
  const cleanId = inputId.toLowerCase().trim();
  
  // Vérifier dans le mapping
  if (ANIME_ID_MAPPINGS[cleanId]) {
    console.log(`🔄 Mapping: ${inputId} → ${ANIME_ID_MAPPINGS[cleanId]}`);
    return ANIME_ID_MAPPINGS[cleanId];
  }
  
  // Si pas de mapping trouvé, retourner l'ID original
  return inputId;
}

/**
 * Ajoute dynamiquement un nouveau mapping
 */
export function addAnimeMapping(inputId: string, realId: string): void {
  ANIME_ID_MAPPINGS[inputId.toLowerCase()] = realId;
  console.log(`📝 Nouveau mapping ajouté: ${inputId} → ${realId}`);
}

/**
 * Suggestions automatiques basées sur des patterns communs
 */
export function suggestAlternativeIds(inputId: string): string[] {
  const suggestions: string[] = [];
  const cleanId = inputId.toLowerCase();
  
  // Patterns communs de transformation
  suggestions.push(
    cleanId.replace(/-/g, ''),           // sans tirets
    cleanId.replace(/\s+/g, '-'),        // espaces vers tirets
    cleanId.replace(/'/g, ''),           // sans apostrophes
    cleanId.replace(/:/g, ''),           // sans deux-points
    cleanId.replace(/!/g, ''),           // sans exclamations
  );
  
  // Transformations japonaises communes
  if (cleanId.includes('no')) {
    suggestions.push(cleanId.replace(/no/g, 'no-'));
  }
  
  return [...new Set(suggestions)]; // Éliminer les doublons
}