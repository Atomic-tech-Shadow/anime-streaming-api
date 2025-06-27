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
  
  // États pour les données
  const [animeData, setAnimeData] = useState<AnimeData | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<'VF' | 'VOSTFR'>('VOSTFR');
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<number>(0);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [episodeDetails, setEpisodeDetails] = useState<EpisodeDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [episodeLoading, setEpisodeLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // API Base URL
  const API_BASE = '';

  // Charger les données de l'anime
  useEffect(() => {
    if (!id) return;
    
    const loadAnimeData = async () => {
      try {
        setLoading(true);
        console.log('Chargement données anime pour ID:', id);
        
        const response = await fetch(`${API_BASE}/api/anime/${id}`);
        console.log('Réponse anime status:', response.status);
        
        if (!response.ok) {
          throw new Error(`Erreur ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Données anime reçues:', data);
        
        if (data.success && data.data) {
          setAnimeData(data.data);
          // Sélectionner automatiquement la première saison
          if (data.data.seasons && data.data.seasons.length > 0) {
            const firstSeason = data.data.seasons[0];
            setSelectedSeason(firstSeason);
            loadSeasonEpisodes(firstSeason);
          }
        } else {
          setError('Données anime non trouvées');
        }
      } catch (err) {
        console.error('Erreur chargement anime:', err);
        setError('Erreur lors du chargement de l\'anime');
      } finally {
        setLoading(false);
      }
    };

    loadAnimeData();
  }, [id]);

  // Charger les épisodes d'une saison
  const loadSeasonEpisodes = async (season: Season) => {
    if (!animeData) return;
    
    try {
      setEpisodeLoading(true);
      console.log('Chargement épisodes pour:', { 
        animeId: animeData.id, 
        season: season.number, 
        language: selectedLanguage.toLowerCase() 
      });
      
      const response = await fetch(`${API_BASE}/api/seasons?animeId=${animeData.id}&season=${season.number}&language=${selectedLanguage.toLowerCase()}`);
      
      console.log('Réponse status:', response.status);
      
      if (!response.ok) {
        throw new Error(`Erreur ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Données reçues:', data);
      
      if (data.success && data.data) {
        const episodesList = data.data.episodes || data.data;
        const filteredEpisodes = Array.isArray(episodesList) ? 
          episodesList.filter((ep: Episode) => ep.language === selectedLanguage.toLowerCase()) :
          [];
        setEpisodes(filteredEpisodes);
        
        // Sélectionner automatiquement le premier épisode
        if (filteredEpisodes.length > 0) {
          const firstEpisode = filteredEpisodes[0];
          setSelectedEpisode(firstEpisode);
          loadEpisodeSources(firstEpisode.episodeNumber, selectedLanguage);
        }
      }
    } catch (err) {
      console.error('Erreur chargement épisodes:', err);
      setError('Erreur lors du chargement des épisodes');
    } finally {
      setEpisodeLoading(false);
    }
  };

  // Charger les sources d'un épisode
  const loadEpisodeSources = async (episodeNumber: number, language: 'VF' | 'VOSTFR') => {
    if (!animeData) return;
    
    try {
      setEpisodeLoading(true);
      
      // Construire l'ID selon le format: {nom-anime}-{numéro-épisode}-{langue}
      const languageCode = language.toLowerCase() === 'vf' ? 'vf' : 'vostfr';
      const episodeId = `${animeData.id}-${episodeNumber}-${languageCode}`;
      
      console.log('Chargement épisode avec ID:', episodeId);
      
      const response = await fetch(`${API_BASE}/api/episode/${episodeId}`);
      const data = await response.json();
      
      console.log('Réponse API épisode:', data);
      console.log('Sources disponibles:', data.data?.sources);
      
      if (data.success && data.data && data.data.sources && data.data.sources.length > 0) {
        console.log('Utilisation des vraies sources:', data.data.sources);
        setEpisodeDetails(data.data);
        setSelectedPlayer(0); // Réinitialiser au premier lecteur
      } else {
        console.log('Pas de sources disponibles pour cet épisode');
        // Créer des sources simulées pour les tests
        setEpisodeDetails({
          id: episodeId,
          title: `Épisode ${episodeNumber}`,
          animeTitle: animeData.title,
          episodeNumber,
          sources: [
            {
              url: `https://www.youtube.com/embed/dQw4w9WgXcQ`,
              server: `Serveur 1`,
              quality: '720p',
              language: languageCode,
              type: 'embed',
              serverIndex: 0
            },
            {
              url: `https://www.youtube.com/embed/dQw4w9WgXcQ`,
              server: `Serveur 2`,
              quality: '1080p',
              language: languageCode,
              type: 'embed',
              serverIndex: 1
            }
          ],
          availableServers: ['Serveur 1', 'Serveur 2'],
          url: ''
        });
        setSelectedPlayer(0);
      }
    } catch (err) {
      console.error('Erreur chargement sources:', err);
      setError('Erreur lors du chargement des sources vidéo');
    } finally {
      setEpisodeLoading(false);
    }
  };

  // Navigation entre épisodes
  const navigateEpisode = async (direction: 'prev' | 'next') => {
    if (!selectedEpisode) return;
    
    const currentIndex = episodes.findIndex(ep => ep.id === selectedEpisode.id);
    let newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    
    if (newIndex >= 0 && newIndex < episodes.length) {
      const newEpisode = episodes[newIndex];
      setSelectedEpisode(newEpisode);
      await loadEpisodeSources(newEpisode.episodeNumber, selectedLanguage);
    }
  };

  // Changer de langue
  const changeLanguage = (newLanguage: 'VF' | 'VOSTFR') => {
    setSelectedLanguage(newLanguage);
    if (selectedSeason) {
      loadSeasonEpisodes(selectedSeason);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error && !animeData) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-red-500 text-xl flex items-center gap-2">
          {error}
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
        </div>
      </div>

      <div className="p-4 space-y-6">
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

        {/* Sélecteur de langue - Style anime-sama */}
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
                {/* Drapeau selon la langue */}
                {lang === 'VF' ? (
                  <div className="w-6 h-4 bg-white rounded border border-gray-300 flex">
                    <div className="w-1/3 bg-blue-500 rounded-l"></div>
                    <div className="w-1/3 bg-white"></div>
                    <div className="w-1/3 bg-red-500 rounded-r"></div>
                  </div>
                ) : (
                  <div className="w-6 h-4 bg-white rounded border border-gray-300 flex items-center justify-center relative overflow-hidden">
                    <div className="w-4 h-4 bg-red-600 rounded-full absolute"></div>
                    <div className="w-2 h-2 bg-white rounded-full absolute z-10"></div>
                  </div>
                )}
                {lang}
              </motion.button>
            ))}
          </div>
        )}

        {/* Sélecteurs - Style anime-sama */}
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
                    loadEpisodeSources(episode.episodeNumber, selectedLanguage);
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
            {episodeDetails && episodeDetails.sources.length > 0 && (
              <div className="relative">
                <select
                  value={selectedPlayer}
                  onChange={(e) => setSelectedPlayer(parseInt(e.target.value))}
                  className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg appearance-none cursor-pointer border-2 border-blue-500 font-bold uppercase text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  {episodeDetails.sources.map((source, index) => (
                    <option key={index} value={index}>
                      LECTEUR {index + 1}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white pointer-events-none" size={20} />
              </div>
            )}
          </div>
        )}

        {/* Dernière sélection */}
        {selectedEpisode && (
          <div className="text-gray-300 text-sm">
            <span className="font-bold">DERNIÈRE SÉLECTION :</span> ÉPISODE {selectedEpisode.episodeNumber}
          </div>
        )}

        {/* Navigation entre épisodes - Style anime-sama */}
        {selectedEpisode && (
          <div className="flex justify-center items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => navigateEpisode('prev')}
              disabled={!selectedEpisode || episodes.findIndex(ep => ep.id === selectedEpisode.id) === 0}
              className="p-3 bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={24} className="text-white" />
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
            >
              <Download size={24} className="text-white" />
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => navigateEpisode('next')}
              disabled={!selectedEpisode || episodes.findIndex(ep => ep.id === selectedEpisode.id) === episodes.length - 1}
              className="p-3 bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={24} className="text-white" />
            </motion.button>
          </div>
        )}

        {/* Message d'erreur de pub */}
        {selectedEpisode && (
          <div className="text-center text-gray-300 text-sm italic">
            Pub insistante ou vidéo indisponible ?<br />
            <span className="font-bold">Changez de lecteur.</span>
          </div>
        )}

        {/* Lecteur vidéo - Style anime-sama avec /api/embed/ */}
        {episodeDetails && episodeDetails.sources.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-900 rounded-lg overflow-hidden border-2 border-gray-700"
          >
            <div className="aspect-video relative">
              <iframe
                src={`/api/embed/?url=${encodeURIComponent(episodeDetails.sources[selectedPlayer]?.url)}`}
                className="w-full h-full"
                allowFullScreen
                frameBorder="0"
                title={`${episodeDetails?.title} - ${episodeDetails.sources[selectedPlayer]?.server}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
              />
              {/* Bouton play overlay pour style anime-sama */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  className="w-16 h-16 bg-blue-600/80 rounded-full flex items-center justify-center cursor-pointer pointer-events-auto"
                >
                  <Play size={32} className="text-white ml-1" />
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}

        {episodeLoading && (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
            <div className="text-gray-400">Chargement des épisodes...</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnimePlayerPage;