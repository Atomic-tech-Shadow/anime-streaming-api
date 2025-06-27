import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { ChevronLeft, ChevronRight, ChevronDown, Play, ArrowLeft, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'wouter';

interface Episode {
  id: string;
  title: string;
  episodeNumber: number;
  url: string;
  language: string;
  available: boolean;
}

interface VideoSource {
  url: string;
  server: string;
  quality: string;
  language: string;
  type: string;
  serverIndex: number;
}

interface Season {
  number: number;
  name: string;
  languages: string[];
  episodeCount: number;
  url: string;
}

interface AnimeData {
  id: string;
  title: string;
  description: string;
  image: string;
  genres: string[];
  status: string;
  year: string;
  seasons: Season[];
  url: string;
}

interface EpisodeDetails {
  id: string;
  title: string;
  animeTitle: string;
  episodeNumber: number;
  sources: VideoSource[];
  availableServers: string[];
  url: string;
}

const AnimePlayerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  
  // Récupérer les paramètres de l'URL
  const urlParams = new URLSearchParams(window.location.search);
  const targetSeason = urlParams.get('season');
  const targetEpisode = urlParams.get('episode');
  const targetLang = urlParams.get('lang');
  
  // États pour les données
  const [animeData, setAnimeData] = useState<AnimeData | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<'VF' | 'VOSTFR'>(
    targetLang === 'vf' ? 'VF' : 'VOSTFR'
  );
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<number>(0);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [episodeDetails, setEpisodeDetails] = useState<EpisodeDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [episodeLoading, setEpisodeLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ CORRECTION 1: Configuration API appropriée
  const API_BASE = process.env.NODE_ENV === 'production' 
    ? 'https://api-anime-sama.onrender.com'
    : 'http://localhost:5000';

  // ✅ Fonction de requête avec retry et gestion d'erreurs
  const apiRequest = async (endpoint: string, options = {}) => {
    const maxRetries = 3;
    let attempt = 0;
    
    while (attempt < maxRetries) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
        
        const response = await fetch(`${API_BASE}${endpoint}`, {
          signal: controller.signal,
          ...options
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
      } catch (error) {
        attempt++;
        if (attempt === maxRetries || error.name === 'AbortError') {
          throw error;
        }
        // Attendre avant de réessayer
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  };

  // Charger les données de l'anime
  useEffect(() => {
    if (!id) return;
    
    const loadAnimeData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('Chargement anime:', id);
        const animeResponse = await apiRequest(`/api/anime/${id}`);
        
        if (animeResponse.success && animeResponse.data) {
          setAnimeData(animeResponse.data);
          
          // Sélectionner la saison demandée ou la première
          const seasons = animeResponse.data.seasons || [];
          if (seasons.length > 0) {
            let seasonToSelect = seasons[0];
            if (targetSeason) {
              const requestedSeason = seasons.find((s: any) => s.number === parseInt(targetSeason));
              if (requestedSeason) {
                seasonToSelect = requestedSeason;
              }
            }
            
            setSelectedSeason(seasonToSelect);
            await loadSeasonEpisodes(seasonToSelect, animeResponse.data);
          }
        } else {
          throw new Error('Données anime invalides');
        }
      } catch (err) {
        console.error('Erreur chargement anime:', err);
        setError(`Erreur lors du chargement de l'anime: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    loadAnimeData();
  }, [id]);

  // ✅ CORRECTION 2: Génération correcte des épisodes
  const loadSeasonEpisodes = async (season: Season, animeData: AnimeData) => {
    if (!animeData) return;
    
    try {
      setEpisodeLoading(true);
      setError(null);
      
      // Générer les épisodes pour cette saison
      const episodes: Episode[] = [];
      const languageCode = selectedLanguage.toLowerCase();
      
      for (let i = 1; i <= season.episodeCount; i++) {
        // ✅ Utiliser la vraie logique de génération d'ID
        const episodeId = `${animeData.id}-${i}-${languageCode}`;
        
        episodes.push({
          id: episodeId,
          title: `${animeData.title} - Episode ${i}`,
          episodeNumber: i,
          url: `/episode/${episodeId}`,
          language: selectedLanguage,
          available: true
        });
      }
      
      setEpisodes(episodes);
      
      // Sélectionner l'épisode spécifié ou le premier
      if (episodes.length > 0) {
        let episodeToSelect = episodes[0];
        
        if (targetEpisode) {
          const requestedEpisode = episodes.find(
            (ep: any) => ep.episodeNumber === parseInt(targetEpisode)
          );
          if (requestedEpisode) {
            episodeToSelect = requestedEpisode;
          }
        }
        
        setSelectedEpisode(episodeToSelect);
        await loadEpisodeSources(episodeToSelect.id);
      }
    } catch (err) {
      console.error('Erreur chargement épisodes:', err);
      setError('Erreur lors du chargement des épisodes');
    } finally {
      setEpisodeLoading(false);
    }
  };

  // ✅ CORRECTION 3: Chargement correct des sources
  const loadEpisodeSources = async (episodeId: string) => {
    try {
      setEpisodeLoading(true);
      setError(null);
      
      console.log('Chargement sources pour:', episodeId);
      
      const response = await apiRequest(`/api/episode/${episodeId}`);
      
      if (response.success && response.data && response.data.sources && response.data.sources.length > 0) {
        setEpisodeDetails(response.data);
        setSelectedPlayer(0);
        console.log('Sources chargées:', response.data.sources.length);
      } else {
        console.warn('Aucune source trouvée pour:', episodeId);
        setError('Aucune source vidéo disponible pour cet épisode');
      }
    } catch (err) {
      console.error('Erreur chargement sources:', err);
      setError(`Erreur lors du chargement des sources: ${err.message}`);
    } finally {
      setEpisodeLoading(false);
    }
  };

  // Navigation entre épisodes avec cache reset
  const navigateEpisode = async (direction: 'prev' | 'next') => {
    if (!selectedEpisode) return;
    
    const currentIndex = episodes.findIndex(ep => ep.id === selectedEpisode.id);
    let newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    
    if (newIndex >= 0 && newIndex < episodes.length) {
      const newEpisode = episodes[newIndex];
      setSelectedEpisode(newEpisode);
      setEpisodeDetails(null); // Reset cache
      await loadEpisodeSources(newEpisode.id);
    }
  };

  // ✅ CORRECTION 4: Changement de langue avec regeneration
  const changeLanguage = async (newLanguage: 'VF' | 'VOSTFR') => {
    if (newLanguage === selectedLanguage) return;
    
    setSelectedLanguage(newLanguage);
    setEpisodeDetails(null); // Reset cache
    
    if (selectedSeason && animeData) {
      await loadSeasonEpisodes(selectedSeason, animeData);
    }
  };

  // ✅ Gestion des erreurs de lecteur vidéo
  const handleVideoError = (error: any) => {
    console.error('Erreur lecteur vidéo:', error);
    if (episodeDetails && episodeDetails.sources.length > selectedPlayer + 1) {
      setSelectedPlayer(selectedPlayer + 1);
    } else {
      setError('Aucune source vidéo fonctionnelle disponible');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-white">Chargement de l'anime...</p>
        </div>
      </div>
    );
  }

  if (error && !animeData) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">{error}</div>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (!animeData) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Anime non trouvé</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header avec bouton retour */}
      <div className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800">
        <div className="flex items-center p-4">
          <Link href={`/anime/${id}`} className="mr-4">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700"
            >
              <ArrowLeft size={20} />
            </motion.button>
          </Link>
          <h1 className="text-lg font-semibold truncate">{animeData.title}</h1>
          {selectedEpisode && (
            <span className="ml-auto text-sm text-gray-400">
              Épisode {selectedEpisode.episodeNumber}
            </span>
          )}
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Message d'erreur temporaire */}
        {error && episodeDetails && (
          <div className="bg-yellow-600/20 border border-yellow-600/30 rounded-lg p-3">
            <p className="text-yellow-200 text-sm">{error}</p>
          </div>
        )}

        {/* Bannière avec titre de la saison */}
        <div className="relative rounded-lg overflow-hidden">
          <div 
            className="h-32 bg-cover bg-center"
            style={{
              backgroundImage: `url(${animeData.image})`,
            }}
          />
          <div className="absolute inset-0 bg-black/60" />
          <div className="absolute bottom-4 left-4">
            <h2 className="text-white text-2xl font-bold">{animeData.title}</h2>
            <h3 className="text-gray-300 text-lg uppercase">{selectedSeason?.name}</h3>
          </div>
        </div>

        {/* Sélecteur de langue */}
        {selectedSeason && selectedSeason.languages.length > 1 && (
          <div className="flex gap-2">
            {selectedSeason.languages.map((lang) => (
              <motion.button
                key={lang}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => changeLanguage(lang as 'VF' | 'VOSTFR')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm border-2 transition-all ${
                  selectedLanguage === lang
                    ? 'bg-red-600 border-red-600 text-white'
                    : 'bg-transparent border-gray-600 text-gray-300 hover:border-gray-400'
                }`}
              >
                {lang === 'VF' ? '🇫🇷' : '🇯🇵'} {lang}
              </motion.button>
            ))}
          </div>
        )}

        {/* Sélecteurs d'épisode et serveur */}
        {episodes.length > 0 && (
          <div className="grid grid-cols-2 gap-4">
            {/* Sélecteur d'épisode */}
            <div className="relative">
              <select
                value={selectedEpisode?.id || ''}
                onChange={(e) => {
                  const episode = episodes.find(ep => ep.id === e.target.value);
                  if (episode) {
                    setSelectedEpisode(episode);
                    setEpisodeDetails(null); // Reset cache
                    loadEpisodeSources(episode.id);
                  }
                }}
                className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg appearance-none cursor-pointer border-2 border-blue-500 font-bold uppercase text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                {episodes.map((episode) => (
                  <option key={episode.id} value={episode.id}>
                    ÉPISODE {episode.episodeNumber}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white pointer-events-none" size={20} />
            </div>

            {/* Sélecteur de serveur */}
            {episodeDetails && episodeDetails.sources.length > 1 && (
              <div className="relative">
                <select
                  value={selectedPlayer}
                  onChange={(e) => setSelectedPlayer(parseInt(e.target.value))}
                  className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg appearance-none cursor-pointer border-2 border-green-500 font-bold uppercase text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                >
                  {episodeDetails.sources.map((source, index) => (
                    <option key={index} value={index}>
                      {source.server} - {source.quality}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white pointer-events-none" size={20} />
              </div>
            )}
          </div>
        )}

        {/* Lecteur vidéo */}
        {episodeDetails && episodeDetails.sources[selectedPlayer] && (
          <div className="relative">
            <div className="aspect-video bg-black rounded-lg overflow-hidden">
              {episodeLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                </div>
              ) : (
                <iframe
                  src={episodeDetails.sources[selectedPlayer].url}
                  className="w-full h-full"
                  allowFullScreen
                  frameBorder="0"
                  onError={handleVideoError}
                  title={`${animeData.title} - Episode ${selectedEpisode?.episodeNumber}`}
                />
              )}
            </div>
            
            {/* Contrôles de navigation */}
            <div className="flex justify-between items-center mt-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigateEpisode('prev')}
                disabled={!selectedEpisode || episodes.findIndex(ep => ep.id === selectedEpisode.id) === 0}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                <ChevronLeft size={20} />
                Précédent
              </motion.button>
              
              <div className="text-center">
                <p className="text-sm text-gray-400">
                  {episodeDetails.sources.length > 1 && `Serveur ${selectedPlayer + 1}/${episodeDetails.sources.length}`}
                </p>
              </div>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigateEpisode('next')}
                disabled={!selectedEpisode || episodes.findIndex(ep => ep.id === selectedEpisode.id) === episodes.length - 1}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                Suivant
                <ChevronRight size={20} />
              </motion.button>
            </div>
          </div>
        )}

        {/* Message si pas de sources */}
        {!episodeLoading && !episodeDetails && selectedEpisode && (
          <div className="text-center py-8">
            <p className="text-gray-400 mb-4">Aucune source vidéo disponible</p>
            <button 
              onClick={() => loadEpisodeSources(selectedEpisode.id)}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white"
            >
              Réessayer
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnimePlayerPage;