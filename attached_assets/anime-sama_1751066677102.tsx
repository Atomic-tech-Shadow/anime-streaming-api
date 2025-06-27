import React, { useState, useEffect } from 'react';
import { Search, ArrowLeft } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { motion } from 'framer-motion';

interface SearchResult {
  id: string;
  title: string;
  url: string;
  type: string;
  status: string;
  image: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
  meta?: any;
}

const AnimeSamaPage: React.FC = () => {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [watchHistory, setWatchHistory] = useState<{[key: string]: number}>({});
  const [popularAnimes, setPopularAnimes] = useState<SearchResult[]>([]);

  // Charger l'historique au démarrage
  useEffect(() => {
    const savedHistory = localStorage.getItem('animeWatchHistory');
    if (savedHistory) {
      setWatchHistory(JSON.parse(savedHistory));
    }
    // Charger les animes populaires au démarrage
    loadPopularAnimes();
  }, []);

  // Charger les animes populaires depuis l'API
  const loadPopularAnimes = async () => {
    try {
      const response = await apiRequest('/api/trending');
      
      if (response && response.success && Array.isArray(response.data)) {
        const animesWithImages = response.data.map((anime: any) => ({
          ...anime,
          image: `https://cdn.statically.io/gh/Anime-Sama/IMG/img/contenu/${anime.id}.jpg`,
          status: anime.status || 'Disponible',
          type: anime.type || 'Anime'
        }));
        setPopularAnimes(animesWithImages.slice(0, 12));
      } else {
        console.warn('Format de réponse trending invalide:', response);
        setPopularAnimes([]);
      }
    } catch (error) {
      console.error('Erreur chargement trending:', error);
      setPopularAnimes([]);
    }
  };

  // Configuration API selon la documentation fournie
  const API_BASE_URL = '';
  const API_HEADERS = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  // Fonction utilitaire pour les requêtes API avec retry et cache
  const apiRequest = async (endpoint: string, options = {}) => {
    const maxRetries = 3;
    let attempt = 0;
    
    while (attempt < maxRetries) {
      try {
        const url = `${API_BASE_URL}${endpoint}`;
        const response = await fetch(url, {
          method: 'GET',
          headers: API_HEADERS,
          ...options
        });
        
        if (!response.ok) {
          throw new Error(`Erreur API: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        attempt++;
        if (attempt === maxRetries) {
          console.error('Erreur requête API après', maxRetries, 'tentatives:', error);
          const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
          throw new Error(`API Error: ${errorMessage}`);
        }
        // Attendre avant de réessayer
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  };

  // Recherche d'animes
  const searchAnimes = async (query: string) => {
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await apiRequest(`/api/search?query=${encodeURIComponent(query)}`);
      
      if (response && response.success && Array.isArray(response.data)) {
        // Ajouter des propriétés manquantes pour l'affichage
        const animesWithImages = response.data.map((anime: any) => ({
          ...anime,
          image: `https://cdn.statically.io/gh/Anime-Sama/IMG/img/contenu/${anime.id}.jpg`,
          status: anime.status || 'Disponible',
          type: anime.type || 'Anime'
        }));
        setSearchResults(animesWithImages);
      } else {
        throw new Error('Format de réponse invalide');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de recherche';
      console.error('Erreur recherche:', errorMessage);
      setError('Impossible de rechercher les animes. Vérifiez votre connexion.');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Naviguer vers la page anime dédiée
  const loadAnimeDetails = async (animeId: string) => {
    navigate(`/anime/${animeId}`);
  };

  // Gérer la recherche en temps réel
  useEffect(() => {
    if (searchQuery) {
      const timeoutId = setTimeout(() => {
        searchAnimes(searchQuery);
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: '#0a0a0a' }}>
      {/* Header avec barre de recherche */}
      <div 
        className="sticky top-0 z-50 p-4 border-b border-gray-800"
        style={{ backgroundColor: '#1a1a1a' }}
      >
        <div className="flex items-center gap-4">
          <Link to="/" className="text-white hover:text-gray-300 transition-colors">
            <ArrowLeft size={24} />
          </Link>
          <div className="flex-1 relative">
            {searchQuery ? (
              <div className="flex items-center gap-3">
                <Search size={20} className="text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher des animes..."
                  className="flex-1 bg-transparent text-white placeholder-gray-400 border-none outline-none text-lg"
                  autoFocus
                />
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="flex items-center">
                <div className="text-white font-bold text-lg mr-2">🔍</div>
                <span className="text-white font-medium text-sm uppercase tracking-wide">
                  ANIME-SAMA
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 ml-3">
            <div className="text-white text-xl">🇹🇬</div>
          </div>
        </div>
      </div>

      {/* Page principale */}
      <div className="p-4">
        {/* Barre de recherche si pas déjà focusée */}
        {!searchQuery && (
          <div className="mb-6">
            <div 
              onClick={() => setSearchQuery(' ')}
              className="flex items-center gap-3 p-4 rounded-lg cursor-text border border-gray-700 hover:border-gray-600 transition-colors"
              style={{ backgroundColor: '#1a1a1a' }}
            >
              <Search size={20} className="text-gray-400" />
              <span className="text-gray-400">Rechercher des animes...</span>
            </div>
          </div>
        )}

        {/* Résultats de recherche */}
        {searchResults.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {searchResults.map((anime, index) => (
              <div
                key={`search-${anime.id}-${index}`}
                onClick={() => loadAnimeDetails(anime.id)}
                className="rounded-lg overflow-hidden cursor-pointer hover:scale-105 transition-transform"
                style={{ backgroundColor: '#1a1a1a' }}
              >
                <img
                  src={anime.image}
                  alt={anime.title}
                  className="w-full aspect-[3/4] object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'https://via.placeholder.com/300x400/1a1a1a/ffffff?text=Image+Non+Disponible';
                  }}
                />
                <div className="p-3">
                  <h3 className="text-white font-medium text-sm line-clamp-2">{anime.title}</h3>
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-gray-400 text-xs">{anime.status}</p>
                    {watchHistory[anime.id] && (
                      <span className="text-cyan-400 text-xs bg-cyan-900/30 px-1 rounded">
                        Ep {watchHistory[anime.id]}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!searchQuery && !searchResults.length && (
          <div>
            {/* Section Animes Populaires */}
            {popularAnimes.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-white text-lg font-bold">🔥 Animes Populaires</h2>
                  <button 
                    onClick={() => loadPopularAnimes()}
                    className="text-cyan-400 text-sm hover:text-cyan-300 transition-colors"
                  >
                    Actualiser
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {popularAnimes.map((anime, index) => (
                    <div
                      key={`popular-${anime.id}-${index}`}
                      onClick={() => loadAnimeDetails(anime.id)}
                      className="rounded-lg overflow-hidden cursor-pointer hover:scale-105 transition-transform group"
                      style={{ backgroundColor: '#1a1a1a' }}
                    >
                      <div className="relative">
                        <img
                          src={anime.image}
                          alt={anime.title}
                          className="w-full aspect-[3/4] object-cover group-hover:opacity-90 transition-opacity"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = 'https://via.placeholder.com/300x400/1a1a1a/ffffff?text=Image+Non+Disponible';
                            target.onerror = null; // Prevent infinite loop
                          }}
                        />
                        {watchHistory[anime.id] && (
                          <div className="absolute top-2 right-2 bg-cyan-500 text-white text-xs px-2 py-1 rounded-full">
                            Ep {watchHistory[anime.id]}
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="p-3">
                        <h3 className="text-white font-medium text-sm line-clamp-2 group-hover:text-cyan-400 transition-colors">
                          {anime.title}
                        </h3>
                        <div className="flex justify-between items-center mt-2">
                          <p className="text-gray-400 text-xs">{anime.status}</p>
                          <div className="text-cyan-400 text-xs">#{index + 1}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Message de chargement */}
            {loading && (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
                <p className="text-gray-400 mt-2">Chargement...</p>
              </div>
            )}

            {/* Message d'erreur */}
            {error && (
              <div className="text-center py-8">
                <p className="text-red-400">{error}</p>
                <button 
                  onClick={() => {
                    setError(null);
                    loadPopularAnimes();
                  }}
                  className="mt-2 text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  Réessayer
                </button>
              </div>
            )}

            {/* Message vide si pas d'animes populaires et pas de chargement */}
            {!loading && !error && popularAnimes.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-400 mb-4">Aucun anime disponible pour le moment</p>
                <button 
                  onClick={() => loadPopularAnimes()}
                  className="text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  Actualiser
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnimeSamaPage;
