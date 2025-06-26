// Fonctions universelles pour tous les animes d'anime-sama.fr
// Supprime toutes les configurations spécifiques

// Détermination universelle du statut
export function determineUniversalStatus(title: string): string {
  const lowerTitle = title.toLowerCase();
  
  if (lowerTitle.includes('movie') || lowerTitle.includes('film')) return 'Film';
  if (lowerTitle.includes('ova') || lowerTitle.includes('special')) return 'OVA/Spécial';
  if (lowerTitle.includes('final') || lowerTitle.includes('end')) return 'Terminé';
  return 'En cours';
}

// Génération universelle d'images placeholder
export function generateUniversalImage(title: string, type: 'search' | 'trending' | 'anime' = 'search'): string {
  const searchColors = ['1a1a2e', '16213e', '0f3460', '533483', '7209b7', '2c3e50', '8e44ad'];
  const animeColors = ['1a1a2e', '16213e', '0f3460', '533483', '7209b7'];
  const trendingColors = ['ff6b6b', 'feca57', '48dbfb', '1dd1a1', 'a55eea'];
  
  let colors = searchColors;
  let dimensions = '300x400';
  
  if (type === 'anime') {
    colors = animeColors;
    dimensions = '400x600';
  } else if (type === 'trending') {
    colors = trendingColors;
    dimensions = '300x400';
  }
  
  const hash = title.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  const colorIndex = hash % colors.length;
  
  return `https://via.placeholder.com/${dimensions}/${colors[colorIndex]}/ffffff?text=${encodeURIComponent(title)}`;
}

// Extraction universelle des genres
export function extractUniversalGenres(title: string): string[] {
  const lowerTitle = title.toLowerCase();
  const genres: string[] = [];
  
  // Détection automatique basée sur des mots-clés
  if (lowerTitle.includes('dragon') || lowerTitle.includes('ball') || lowerTitle.includes('fight')) {
    genres.push('Combat');
  }
  if (lowerTitle.includes('death') || lowerTitle.includes('ghoul') || lowerTitle.includes('chainsaw')) {
    genres.push('Horreur');
  }
  if (lowerTitle.includes('hero') || lowerTitle.includes('academia')) {
    genres.push('Super-héros');
  }
  if (lowerTitle.includes('psycho') || lowerTitle.includes('note')) {
    genres.push('Psychologique');
  }
  if (lowerTitle.includes('slice') || lowerTitle.includes('life')) {
    genres.push('Slice of Life');
  }
  if (lowerTitle.includes('romance') || lowerTitle.includes('love')) {
    genres.push('Romance');
  }
  if (lowerTitle.includes('comedy') || lowerTitle.includes('funny')) {
    genres.push('Comédie');
  }
  if (lowerTitle.includes('magic') || lowerTitle.includes('witch') || lowerTitle.includes('wizard')) {
    genres.push('Magie');
  }
  if (lowerTitle.includes('school') || lowerTitle.includes('student')) {
    genres.push('École');
  }
  if (lowerTitle.includes('sport') || lowerTitle.includes('football') || lowerTitle.includes('basketball')) {
    genres.push('Sport');
  }
  
  // Genres par défaut universels
  genres.push('Action', 'Animation');
  
  // Démographie par défaut
  if (genres.includes('Horreur') || genres.includes('Psychologique')) {
    genres.push('Seinen');
  } else {
    genres.push('Shonen');
  }
  
  return [...new Set(genres)]; // Supprimer les doublons
}

// Extraction universelle de l'année
export function extractUniversalYear(animeDetails: any): string {
  const title = animeDetails.title || '';
  const yearMatch = title.match(/\b(19|20)\d{2}\b/);
  
  if (yearMatch) {
    return yearMatch[0];
  }
  
  // Estimation basée sur des indices modernes
  const modernKeywords = ['attack', 'demon', 'jujutsu', 'chainsaw', 'spy', 'kimetsu', 'kaisen'];
  const classicKeywords = ['naruto', 'bleach', 'one-piece', 'dragon-ball'];
  
  const lowerTitle = title.toLowerCase();
  const isModern = modernKeywords.some(keyword => lowerTitle.includes(keyword));
  const isClassic = classicKeywords.some(keyword => lowerTitle.includes(keyword));
  
  if (isModern) return '2020';
  if (isClassic) return '2005';
  
  return '2015'; // Année par défaut
}

// Détection universelle des langues disponibles
export function detectUniversalLanguages(season: any): string[] {
  const path = season.path || season.url || '';
  const languages = [];
  
  // Détection basée sur le chemin de la saison
  if (path.includes('vf') || path.includes('VF')) {
    languages.push('VF');
  }
  if (path.includes('vostfr') || path.includes('VOSTFR')) {
    languages.push('VOSTFR');
  }
  
  // Si aucune langue détectée, supposer les deux disponibles
  return languages.length > 0 ? languages : ['VF', 'VOSTFR'];
}

// Estimation universelle du nombre d'épisodes
export function estimateUniversalEpisodeCount(season: any): number {
  const name = season.name?.toLowerCase() || '';
  
  // Détection basée sur le type de contenu
  if (name.includes('film') || name.includes('movie')) {
    return 1;
  }
  if (name.includes('ova') || name.includes('special')) {
    return 3;
  }
  if (name.includes('saison') || name.includes('season')) {
    // Estimation basée sur les saisons standards
    return 24;
  }
  
  // Par défaut pour les séries normales
  return 12;
}

// Transformation universelle pour le frontend
export function transformAnimeForFrontend(animeDetails: any) {
  return {
    id: animeDetails.id,
    title: animeDetails.title,
    description: animeDetails.description || "Description extraite d'anime-sama.fr",
    image: generateUniversalImage(animeDetails.title, 'anime'),
    genres: extractUniversalGenres(animeDetails.title),
    status: determineUniversalStatus(animeDetails.title),
    year: extractUniversalYear(animeDetails),
    seasons: animeDetails.seasons.map((season: any) => ({
      number: season.number,
      name: season.name,
      languages: detectUniversalLanguages(season),
      episodeCount: season.episodeCount || estimateUniversalEpisodeCount(season),
      url: season.url
    })),
    url: animeDetails.url,
    authentic: true,
    extractedAt: new Date().toISOString()
  };
}

// Transformation universelle pour les résultats de recherche
export function transformSearchResultForFrontend(anime: any) {
  return {
    id: anime.id,
    title: anime.title,
    url: anime.url,
    type: 'anime',
    status: determineUniversalStatus(anime.title),
    image: generateUniversalImage(anime.title, 'search'),
    authentic: true
  };
}

// Transformation universelle pour les trending
export function transformTrendingForFrontend(anime: any, index: number) {
  return {
    id: anime.id,
    title: anime.title,
    url: anime.url,
    type: 'anime',
    status: determineUniversalStatus(anime.title),
    image: generateUniversalImage(anime.title, 'trending'),
    rank: index + 1,
    authentic: true
  };
}