/**
 * Configuration centralisée de l'API Anime-Sama
 * 
 * Utilise l'API de production déployée sur Render
 * Fallback automatique vers l'environnement local si nécessaire
 */

// Configuration de l'API
export const API_CONFIG = {
  // URL de production (recommandée)
  PRODUCTION_URL: 'https://api-anime-sama.onrender.com',
  
  // URL de développement local
  LOCAL_URL: 'http://localhost:5000',
  
  // URL par défaut (production)
  BASE_URL: 'https://api-anime-sama.onrender.com',
  
  // Timeout pour les requêtes (en ms)
  TIMEOUT: 10000,
  
  // Headers par défaut
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
};

// Fonction utilitaire pour construire les URLs
export function buildApiUrl(endpoint, params = {}) {
  const url = new URL(endpoint, API_CONFIG.BASE_URL);
  
  // Ajouter les paramètres de requête
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, value);
    }
  });
  
  return url.toString();
}

// Fonction utilitaire pour les requêtes API
export async function apiRequest(endpoint, options = {}) {
  const url = buildApiUrl(endpoint);
  
  const config = {
    timeout: API_CONFIG.TIMEOUT,
    headers: {
      ...API_CONFIG.DEFAULT_HEADERS,
      ...options.headers
    },
    ...options
  };
  
  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} - ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API Request failed:', error);
    throw error;
  }
}

// Fonctions spécifiques pour chaque endpoint
export const AnimeAPI = {
  // Recherche d'animes
  search: (query) => apiRequest(`/api/search?query=${encodeURIComponent(query)}`, { 
    method: 'GET'
  }).then(response => response.data),
  
  // Détails d'un anime
  getAnime: (animeId) => apiRequest(`/api/anime/${animeId}`).then(response => response.data),
  
  // Épisodes par saison
  getSeasonEpisodes: (animeId, season, language = 'vostfr') => 
    apiRequest(`/api/seasons?animeId=${animeId}&season=${season}&language=${language}`, {
      method: 'GET'
    }).then(response => response.data),
  
  // Sources de streaming d'un épisode
  getEpisodeSources: (episodeId) => apiRequest(`/api/episode/${episodeId}`).then(response => response.data),
  
  // Anime tendances
  getTrending: () => apiRequest('/api/trending').then(response => response.data),
  
  // Catalogue
  getCatalogue: () => apiRequest('/api/catalogue').then(response => response.data),
  
  // Anime aléatoire
  getRandom: () => apiRequest('/api/random').then(response => response.data),
  
  // Genres disponibles
  getGenres: () => apiRequest('/api/genres').then(response => response.data),
  
  // État de l'API
  getHealth: () => apiRequest('/api/health').then(response => response.data),
  getStatus: () => apiRequest('/api/status').then(response => response.data)
};

// Exemples d'utilisation
export const examples = {
  // Rechercher un anime
  searchExample: async () => {
    try {
      const results = await AnimeAPI.search('demon slayer');
      console.log('Résultats de recherche:', results);
      return results;
    } catch (error) {
      console.error('Erreur de recherche:', error);
    }
  },
  
  // Obtenir les épisodes d'une saison
  episodesExample: async () => {
    try {
      const episodes = await AnimeAPI.getSeasonEpisodes('chainsaw-man', 1, 'vostfr');
      console.log(`${episodes.length} épisodes trouvés:`, episodes);
      return episodes;
    } catch (error) {
      console.error('Erreur épisodes:', error);
    }
  },
  
  // Obtenir les sources de streaming
  streamingExample: async () => {
    try {
      const sources = await AnimeAPI.getEpisodeSources('demon-slayer-episode-1-vostfr');
      console.log('Sources de streaming:', sources);
      return sources;
    } catch (error) {
      console.error('Erreur streaming:', error);
    }
  }
};

// Configuration pour différents environnements
export const ENV_CONFIG = {
  development: {
    ...API_CONFIG,
    BASE_URL: API_CONFIG.LOCAL_URL
  },
  
  production: {
    ...API_CONFIG,
    BASE_URL: API_CONFIG.PRODUCTION_URL
  },
  
  // Auto-détection de l'environnement
  auto: () => {
    const isLocal = window.location.hostname === 'localhost' || 
                   window.location.hostname === '127.0.0.1';
    
    return isLocal ? ENV_CONFIG.development : ENV_CONFIG.production;
  }
};

export default API_CONFIG;