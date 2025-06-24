import React, { useState, useEffect } from 'react';
import { Search, ArrowLeft, Download } from 'lucide-react';
import { Link } from 'wouter';
import MainLayout from '@/components/layout/main-layout';
import '../styles/anime-sama.css';

interface SearchResult {
  id: string;
  title: string;
  url: string;
  type: string;
  status: string;
  image: string;
}

interface AnimeDetails {
  id: string;
  title: string;
  description: string;
  image: string;
  genres: string[];
  status: string;
  year: string;
  seasons: Season[];
  url: string;
  progressInfo?: {
    advancement: string;
    correspondence: string;
    totalEpisodes?: number;
    hasFilms?: boolean;
    hasScans?: boolean;
  };
}

interface Season {
  number: number;
  name: string;
  languages: string[];
  episodeCount: number;
  url: string;
}

interface Episode {
  id: string;
  title: string;
  episodeNumber: number;
  url: string;
  language: string;
  available: boolean;
}

interface EpisodeDetails {
  id: string;
  title: string;
  animeTitle: string;
  episodeNumber: number;
  sources: VideoSource[];
  embedUrl?: string;
  corsInfo?: {
    note: string;
    proxyEndpoint: string;
    embedEndpoint: string;
  };
  availableServers: string[];
  url: string;
}

interface VideoSource {
  url: string;
  proxyUrl?: string;
  embedUrl?: string;
  server: string;
  serverName?: string;
  quality: string;
  language: string;
  type: string;
  serverIndex: number;
  isEmbed?: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
  meta?: any;
}

const AnimeSamaPage: React.FC = () => {
  const [currentView, setCurrentView] = useState<'search' | 'anime' | 'player'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedAnime, setSelectedAnime] = useState<AnimeDetails | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<'VF' | 'VOSTFR'>('VOSTFR');
  const [availableLanguages, setAvailableLanguages] = useState<string[]>(['VOSTFR']);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [episodeDetails, setEpisodeDetails] = useState<EpisodeDetails | null>(null);
  const [selectedServer, setSelectedServer] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [watchHistory, setWatchHistory] = useState<{[key: string]: number}>({});
  const [videoProgress, setVideoProgress] = useState<{[key: string]: number}>({});
  const [lastWatched, setLastWatched] = useState<string | null>(null);
  const [popularAnimes, setPopularAnimes] = useState<SearchResult[]>([]);
  
  // CORRECTION 6: Race Conditions - Variable de verrouillage
  // CORRECTIONS CRITIQUES selon documentation
  const [languageChangeInProgress, setLanguageChangeInProgress] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastSuccessfulLanguage, setLastSuccessfulLanguage] = useState('VOSTFR');
  const [lastEpisodeId, setLastEpisodeId] = useState('');
  const [videoSrc, setVideoSrc] = useState('');
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  
  // États séparés par langue pour éviter les conflits
  const [episodesByLanguage, setEpisodesByLanguage] = useState<{
    VF: {[key: string]: Episode[]};
    VOSTFR: {[key: string]: Episode[]};
  }>({
    VF: {},
    VOSTFR: {}
  });
  
  const [currentVideoByLanguage, setCurrentVideoByLanguage] = useState<{
    VF: {episode: Episode | null, videoSrc: string} | null;
    VOSTFR: {episode: Episode | null, videoSrc: string} | null;
  }>({
    VF: null,
    VOSTFR: null
  });

  // État pour la gestion du proxy URL
  const [currentVideoUrl, setCurrentVideoUrl] = useState('');



  // Hook pour débounce les changements
  const useDebounce = (value: any, delay: number) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    
    useEffect(() => {
      const handler = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);
      
      return () => {
        clearTimeout(handler);
      };
    }, [value, delay]);
    
    return debouncedValue;
  };

  // Fonction pour récupérer l'URL proxy des vidéos
  const getProxyUrl = async () => {
    if (!selectedEpisode) return '';
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/episode/${selectedEpisode.id}`);
      const data = await response.json();
      
      if (data.success && data.data.sources && data.data.sources.length > 0) {
        const source = data.data.sources[selectedServer] || data.data.sources[0];
        return `${API_BASE_URL}${source.proxyUrl}`;
      }
    } catch (error) {
      console.error('Erreur chargement source:', error);
    }
    return '';
  };

  // Effet pour mettre à jour l'URL vidéo quand l'épisode ou le serveur change
  useEffect(() => {
    if (selectedEpisode) {
      getProxyUrl().then(url => setCurrentVideoUrl(url));
    }
  }, [selectedEpisode, selectedServer]);

  // Protection contre les changements rapides
  const debouncedLanguage = useDebounce(selectedLanguage, 300);

  // Cache robuste avec nettoyage par langue
  const cache = new Map();
  
  const getCachedData = async (key: string, fetcher: () => Promise<any>, ttl = 300000) => {
    if (cache.has(key)) {
      const { data, timestamp } = cache.get(key);
      if (Date.now() - timestamp < ttl) {
        return data;
      }
    }
    
    const data = await fetcher();
    cache.set(key, { data, timestamp: Date.now() });
    return data;
  };
  
  // CORRECTION CRITIQUE: Nettoyage cache par langue
  const clearLanguageCache = (language: string) => {
    console.log(`Nettoyage cache pour langue: ${language}`);
    
    // Vider cache Map
    for (const [key] of cache.entries()) {
      if (key.includes(language.toLowerCase()) || key.includes('episode') || key.includes('anime')) {
        cache.delete(key);
      }
    }
    
    // Vider localStorage
    Object.keys(localStorage).forEach(key => {
      if (key.includes('episode') || key.includes('anime') || key.includes(language.toLowerCase())) {
        localStorage.removeItem(key);
      }
    });
  };

  // CORRECTION CRITIQUE 1: Construction ID épisode avec langue
  const buildEpisodeIdWithLanguage = (animeId: string, episodeNumber: number, language: string, season: number | null = null) => {
    const langCode = language.toLowerCase(); // 'vf' ou 'vostfr'
    
    if (season && season > 1) {
      return `${animeId}-saison${season}-episode-${episodeNumber}-${langCode}`;
    }
    return `${animeId}-episode-${episodeNumber}-${langCode}`;
  };

  // CORRECTION CRITIQUE 2: Changement de langue avec nettoyage complet
  let languageChangeTimeout: NodeJS.Timeout | null = null;

  const handleLanguageChange = async (newLanguage: 'VF' | 'VOSTFR') => {
    if (languageChangeInProgress || newLanguage === selectedLanguage) {
      console.log('Changement langue ignoré - déjà en cours ou même langue');
      return;
    }

    console.log(`Changement langue: ${selectedLanguage} -> ${newLanguage}`);
    
    setLanguageChangeInProgress(true);
    setLoading(true);
    
    try {
      // CRITIQUE: Sauvegarder l'état actuel
      if (currentEpisode && videoSrc) {
        setCurrentVideoByLanguage(prev => ({
          ...prev,
          [selectedLanguage]: {
            episode: currentEpisode,
            videoSrc: videoSrc
          }
        }));
      }

      // CRITIQUE: Vider tout le cache d'épisodes
      clearLanguageCache(selectedLanguage);
      
      // Réinitialiser état du lecteur
      setCurrentEpisode(null);
      setVideoSrc('');
      setEpisodes([]);
      setEpisodeDetails(null);
      setSelectedEpisode(null);
      
      // Attendre délai pour éviter race conditions
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Mettre à jour la langue
      setSelectedLanguage(newLanguage);
      setLastSuccessfulLanguage(newLanguage);
      
      // Recharger les épisodes avec nouvelle langue
      if (selectedAnime && selectedSeason) {
        await loadEpisodesForLanguage(selectedAnime.id, selectedSeason, newLanguage);
      }
      
    } catch (error) {
      console.error('Erreur changement langue:', error);
      // Fallback vers dernière langue fonctionnelle
      setSelectedLanguage(lastSuccessfulLanguage);
      setError(`Erreur changement langue: ${error}`);
    } finally {
      setLanguageChangeInProgress(false);
      setLoading(false);
    }
  };

  // CORRECTION CRITIQUE 3: Débounce anti-race pour changement langue
  const debouncedLanguageChange = (newLanguage: 'VF' | 'VOSTFR') => {
    if (languageChangeTimeout) {
      clearTimeout(languageChangeTimeout);
    }
    
    languageChangeTimeout = setTimeout(() => {
      handleLanguageChange(newLanguage);
    }, 300);
  };

  // CORRECTION CRITIQUE 4: Chargement épisode avec correspondance parfaite
  let episodeLoadingQueue: {cancel: boolean, episodeId: string} | null = null;

  const loadEpisodeWithQueue = async (episodeId: string) => {
    // Annuler le chargement précédent
    if (episodeLoadingQueue) {
      episodeLoadingQueue.cancel = true;
    }
    
    // Créer nouvelle tâche
    const currentTask = { cancel: false, episodeId };
    episodeLoadingQueue = currentTask;
    
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (currentTask.cancel) {
        console.log('Chargement épisode annulé:', episodeId);
        return;
      }
      
      const apiUrl = process.env.NODE_ENV === 'development' 
        ? `/api/episode/${episodeId}?_=${Date.now()}`
        : `${API_BASE_URL}/api/episode/${episodeId}?_=${Date.now()}`;
        
      const response = await fetch(apiUrl);
      const data = await response.json();
      
      if (currentTask.cancel) {
        console.log('Chargement épisode annulé après fetch:', episodeId);
        return;
      }
      
      if (data.success && data.data.sources.length > 0) {
        const embedUrl = `${API_BASE_URL}${data.data.sources[0].embedUrl || data.data.sources[0].proxyUrl}`;
        updateVideoPlayer(embedUrl, episodeId);
      }
      
    } catch (error) {
      if (!currentTask.cancel) {
        console.error('Erreur chargement épisode:', error);
        setError('Impossible de charger cet épisode');
      }
    }
  };

  // CORRECTION CRITIQUE 5: Mise à jour lecteur vidéo avec CORS
  const updateVideoPlayer = (embedUrl: string, episodeId: string) => {
    console.log(`Mise à jour lecteur: ${episodeId} -> ${embedUrl}`);
    
    // Vider l'iframe avant de charger le nouveau
    const iframe = document.querySelector('#video-player iframe') as HTMLIFrameElement;
    if (iframe) {
      iframe.src = 'about:blank';
      setTimeout(() => {
        iframe.src = embedUrl;
        iframe.setAttribute('allowfullscreen', 'true');
        iframe.setAttribute('allow', 'autoplay; fullscreen');
      }, 100);
    }
    
    setVideoSrc(embedUrl);
    setLastEpisodeId(episodeId);
  };

  // CORRECTION CRITIQUE 6: Chargement épisodes par langue
  const loadEpisodesForLanguage = async (animeId: string, season: Season, language: 'VF' | 'VOSTFR') => {
    const langCode = language.toLowerCase() as 'vf' | 'vostfr';
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/seasons?animeId=${animeId}&season=${season.number}&language=${langCode}&_=${Date.now()}`);
      const data = await response.json();
      
      if (data.success && data.data.episodes && data.data.episodes.length > 0) {
        const correctedEpisodes = correctEpisodeNumbers(animeId, season.number, data.data.episodes);
        
        // Sauvegarder dans cache par langue
        setEpisodesByLanguage(prev => ({
          ...prev,
          [language]: {
            ...prev[language],
            [`${animeId}-${season.number}`]: correctedEpisodes
          }
        }));
        
        setEpisodes(correctedEpisodes);
        setSelectedSeason(season);
        
        // Charger le premier épisode
        if (correctedEpisodes.length > 0) {
          const firstEpisode = correctedEpisodes[0];
          setSelectedEpisode(firstEpisode);
          await loadEpisodeWithQueue(firstEpisode.id);
        }
        
      } else {
        throw new Error('Aucun épisode trouvé pour cette langue');
      }
    } catch (error) {
      console.error(`Erreur chargement épisodes ${language}:`, error);
      setError(`Impossible de charger les épisodes en ${language}`);
    }
  };

  // Charger l'historique au démarrage
  useEffect(() => {
    const savedHistory = localStorage.getItem('animeWatchHistory');
    if (savedHistory) {
      setWatchHistory(JSON.parse(savedHistory));
    }
    
    // Charger les animes populaires au démarrage
    loadPopularAnimes();
    
    // Gestionnaire global pour les promesses non capturées - Version corrigée
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const errorReason = event.reason;
      
      // Logger l'erreur pour diagnostic mais toujours prévenir le crash
      console.warn('Unhandled promise rejection caught and handled:', {
        reason: errorReason?.message || errorReason,
        stack: errorReason?.stack
      });
      
      // Toujours prévenir le crash de l'application
      event.preventDefault();
    };
    
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // Configuration API avec l'API anime-sama externe
  const API_BASE_URL = 'https://api-anime-sama.onrender.com';
  
  // Chargement des animes populaires avec gestion d'erreurs robuste
  const loadPopularAnimes = async () => {
    try {
      // Utiliser l'API externe anime-sama
      const apiUrl = `${API_BASE_URL}/api/trending`;
        
      const response = await fetch(apiUrl, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(10000)
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data && Array.isArray(result.data)) {
          const trendingAnimes = result.data.slice(0, 12);
    
          setPopularAnimes(trendingAnimes);
          return;
        }
      }
      
      setPopularAnimes([]);
      
    } catch (error: any) {
      console.log('Erreur chargement trending:', error);
      setPopularAnimes([]);
    }
  };



  // Configuration API robuste pour Replit
  // Configuration API supprimée - utilisation de API_BASE_URL globale
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  const REQUEST_TIMEOUT = 15000; // 15 secondes
  
  // Client HTTP robuste avec gestion d'erreurs silencieuse
  const createApiClient = () => {
    const baseHeaders = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    };
    
    return {
      async get(endpoint: string, params: Record<string, string> = {}): Promise<any> {
        const baseUrl = process.env.NODE_ENV === 'development' ? '' : API_BASE_URL;
        const url = new URL(`${baseUrl}${endpoint}`);
        
        // Ajout des paramètres + timestamp anti-cache
        Object.entries(params).forEach(([key, value]) => {
          url.searchParams.append(key, value);
        });
        url.searchParams.append('_t', Date.now().toString());
        

        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
        
        try {
          const response = await fetch(url.toString(), {
            method: 'GET',
            headers: baseHeaders,
            cache: 'no-store',
            mode: 'cors',
            credentials: 'omit',
            signal: controller.signal
          }).catch(fetchError => {
            // Gestion silencieuse des erreurs fetch pour éviter unhandledrejection

            throw new Error(`Network error: ${fetchError.message}`);
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          const data = await response.json().catch(jsonError => {

            throw new Error(`Invalid response format`);
          });
          

          return data;
          
        } catch (error: any) {
          clearTimeout(timeoutId);

          throw error;
        }
      }
    };
  };

  const apiClient = createApiClient();

  // Système de retry automatique avec gestion d'erreurs silencieuse
  const loadEpisodesWithRetry = async (animeId: string, season: Season, language: string, maxRetries = 3): Promise<any> => {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {

        
        // Délai exponentiel entre les tentatives
        if (attempt > 1) {
          const delay = Math.pow(2, attempt - 1) * 1000; // 2s, 4s, 8s
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        const data = await apiClient.get('/api/seasons', {
          animeId,
          season: season.number.toString(),
          language: language.toLowerCase()
        }).catch(apiError => {
          // Capture silencieuse des erreurs API
          lastError = apiError;
          throw apiError;
        });
        

        setLastSuccessfulLanguage(language);
        setRetryCount(0);
        return data;
        
      } catch (error: any) {
        lastError = error;

        
        if (attempt === maxRetries) {

          // Retourner une structure vide au lieu de throw pour éviter unhandledrejection
          return { success: false, data: { episodes: [] }, error: error.message };
        }
      }
    }
    
    // Fallback de sécurité
    return { success: false, data: { episodes: [] }, error: lastError?.message || 'Unknown error' };
  };
  
  // Mapping correct des épisodes One Piece selon documentation
  const SEASON_MAPPINGS = {
    'one-piece': {
      1: { start: 1, end: 61, name: "Saga 1 (East Blue)" },
      2: { start: 62, end: 135, name: "Saga 2 (Alabasta)" },
      3: { start: 136, end: 206, name: "Saga 3 (Ile céleste)" },
      4: { start: 207, end: 325, name: "Saga 4 (Water Seven)" },
      5: { start: 326, end: 384, name: "Saga 5 (Thriller Bark)" },
      6: { start: 385, end: 516, name: "Saga 6 (Guerre au Sommet)" },
      7: { start: 517, end: 574, name: "Saga 7 (Ile des Hommes-Poissons)" },
      8: { start: 575, end: 746, name: "Saga 8 (Dressrosa)" },
      9: { start: 747, end: 889, name: "Saga 9 (Ile Tougato)" },
      10: { start: 890, end: 1086, name: "Saga 10 (Pays des Wa)" },
      11: { start: 1087, end: 1122, name: "Saga 11 (Egghead)" }
    }
  };
  
  // Configuration optimisée selon le guide de configuration API
  const API_CONFIG = {
    timeout: 20000,
    maxRetries: 3,
    retryDelay: 2000,
    cacheEnabled: true,
    cacheTTL: 300000 // 5 minutes
  };
  
  // Configuration selon le guide de configuration API
  const requestConfig = {
    timeout: 20000,
    maxRetries: 3,
    headers: {
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
      'Cache-Control': 'no-cache'
    }
  };

  // CORRECTION 5: Fonction de retry automatique pour vidéos
  const loadVideoSourceWithRetry = (serverIndex: number, retryCount = 0) => {
    const maxRetries = 3;
    const availableSources = episodeDetails?.sources || [];
    
    if (retryCount < maxRetries) {
      setTimeout(() => {
        setSelectedServer(serverIndex); // Force reload
      }, 2000 * (retryCount + 1)); // Délai progressif
    } else if (serverIndex + 1 < availableSources.length) {
      setSelectedServer(serverIndex + 1);
    } else {
      setError('Tous les serveurs vidéo ont échoué. Pub insistante ou vidéo indisponible ? Changez de lecteur.');
    }
  };

  // CORRECTION 5: Gestion d'erreurs vidéo avec fallback automatique
  const handleVideoError = (currentServerIndex: number) => {
    const sources = episodeDetails?.sources || [];
    
    if (currentServerIndex + 1 < sources.length) {
      setSelectedServer(currentServerIndex + 1);
    } else {
      setError('Aucune source vidéo disponible. Essayez un autre épisode.');
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
      // Utiliser l'API locale en développement
      const apiUrl = process.env.NODE_ENV === 'development' 
        ? `/api/search?query=${encodeURIComponent(query)}` 
        : `${API_BASE_URL}/api/search?query=${encodeURIComponent(query)}`;
        
      const response = await fetch(apiUrl, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(15000)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const apiResponse: ApiResponse<SearchResult[]> = await response.json();
      
      if (!apiResponse.success) {
        throw new Error('Erreur lors de la recherche');
      }
      

      setSearchResults(apiResponse.data);
    } catch (err: any) {

      setError('Impossible de rechercher les animes');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Charger les détails d'un anime avec configuration validée
  const loadAnimeDetails = async (animeId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Utiliser l'API locale en développement
      const apiUrl = process.env.NODE_ENV === 'development' 
        ? `/api/anime/${animeId}` 
        : `${API_BASE_URL}/api/anime/${animeId}`;
        
      const response = await fetch(apiUrl, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(15000)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const apiResponse: ApiResponse<AnimeDetails> = await response.json();
      
      if (!apiResponse.success || !apiResponse.data) {
        throw new Error('Données anime non disponibles');
      }
      
      setSelectedAnime(apiResponse.data);
      setCurrentView('anime');
      setSelectedSeason(null);
      setEpisodes([]);
    } catch (err: any) {
      setError('Impossible de charger les détails de l\'anime');
    } finally {
      setLoading(false);
    }
  };

  // Fonction de correction des numéros d'épisodes selon documentation
  const correctEpisodeNumbers = (animeId: string, seasonNumber: number, episodes: Episode[]): Episode[] => {
    // Correction spécifique pour One Piece selon documentation
    if (animeId === 'one-piece') {
      let start = 1, end = 1122;
      
      // Mapping One Piece selon documentation
      if (seasonNumber === 11) { start = 1087; end = 1122; } // Saga 11 (Egghead)
      else if (seasonNumber === 10) { start = 890; end = 1086; } // Saga 10 (Pays des Wa)
      else if (seasonNumber === 9) { start = 747; end = 889; } // Saga 9 (Ile Tougato)
      else if (seasonNumber === 8) { start = 575; end = 746; } // Saga 8 (Dressrosa)
      else if (seasonNumber === 7) { start = 517; end = 574; } // Saga 7 (Ile des Hommes-Poissons)
      else if (seasonNumber === 6) { start = 385; end = 516; } // Saga 6 (Guerre au Sommet)
      else if (seasonNumber === 5) { start = 326; end = 384; } // Saga 5 (Thriller Bark)
      else if (seasonNumber === 4) { start = 207; end = 325; } // Saga 4 (Water Seven)
      else if (seasonNumber === 3) { start = 136; end = 206; } // Saga 3 (Ile céleste)
      else if (seasonNumber === 2) { start = 62; end = 135; } // Saga 2 (Alabasta)
      else if (seasonNumber === 1) { start = 1; end = 61; } // Saga 1 (East Blue)
      
      const correctedEpisodes: Episode[] = [];
      for (let i = start; i <= end; i++) {
        correctedEpisodes.push({
          id: `${animeId}-episode-${i}-${episodes[0]?.language || 'vostfr'}`,
          episodeNumber: i,
          title: `Episode ${i}`,
          language: episodes[0]?.language || 'vostfr',
          url: `${API_BASE_URL}/api/episode/${animeId}-episode-${i}-${episodes[0]?.language || 'vostfr'}`,
          available: true
        });
      }
      
      return correctedEpisodes;
    }
    
    return episodes;
  };

  // Détection des langues selon documentation validée
  const detectAvailableLanguages = async (animeId: string, seasonNumber: number): Promise<string[]> => {

    
    const languages: string[] = [];
    
    // Tester VF d'abord selon documentation (One Piece 1093 confirmé en VF)
    try {
      const vfResponse = await fetch(`${API_BASE_URL}/api/seasons?animeId=${animeId}&season=${seasonNumber}&language=vf`, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(8000)
      });
      
      if (vfResponse.ok) {
        const vfData = await vfResponse.json();
        if (vfData.success && vfData.data?.episodes?.length > 0) {
          languages.push('VF');

        }
      }
    } catch (err) {
    }
    
    // Tester VOSTFR
    try {
      const vostfrResponse = await fetch(`${API_BASE_URL}/api/seasons?animeId=${animeId}&season=${seasonNumber}&language=vostfr`, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(8000)
      });
      
      if (vostfrResponse.ok) {
        const vostfrData = await vostfrResponse.json();
        if (vostfrData.success && vostfrData.data?.episodes?.length > 0) {
          languages.push('VOSTFR');

        }
      }
    } catch (err) {
    }
    
    // Si aucune langue détectée, utiliser le système universel
    if (languages.length === 0) {

      return ['UNIVERSAL'];
    }
    

    return languages;
  };

  // Système universel optimisé selon la documentation API
  const loadEpisodesWithUniversalSystem = async (animeId: string, season: Season) => {
    
    // Étape 1: Endpoint content avec données authentiques
    try {
      const contentResponse = await fetch(`${API_BASE_URL}/api/content?animeId=${animeId}&type=episodes`);
      
      if (contentResponse.ok) {
        const contentData = await contentResponse.json();
        
        if (contentData.success && contentData.data && Array.isArray(contentData.data) && contentData.data.length > 0) {
          const seasonEpisodes = contentData.data.filter((ep: any) => 
            !ep.seasonNumber || ep.seasonNumber === season.number
          );
          
          if (seasonEpisodes.length > 0) {
            
            const formattedEpisodes = seasonEpisodes.map((ep: any, index: number) => ({
              id: ep.id || `${animeId}-s${season.number}-e${index + 1}-universal`,
              episodeNumber: ep.episodeNumber || index + 1,
              title: ep.title || `Épisode ${index + 1}`,
              language: 'VOSTFR',
              url: ep.url || '',
              available: true
            }));
            
            setEpisodes(formattedEpisodes);
            setSelectedSeason(season);
            setAvailableLanguages(['VOSTFR']);
            setSelectedLanguage('VOSTFR');
            setSelectedEpisode(formattedEpisodes[0]);
            await loadEpisodeSources(formattedEpisodes[0].id);
            
            setError(`${formattedEpisodes.length} épisodes authentiques chargés via système universel`);
            return;
          }
        }
      }
    } catch (contentErr) {
    }
    
    // Étape 2: Endpoint catalogue pour nombre d'épisodes réel
    try {
      const catalogueResponse = await fetch(`${API_BASE_URL}/api/catalogue?search=${animeId}`);
      
      if (catalogueResponse.ok) {
        const catalogueData = await catalogueResponse.json();
        
        if (catalogueData.success && catalogueData.data && Array.isArray(catalogueData.data)) {
          const animeInfo = catalogueData.data.find((a: any) => 
            a.id === animeId || a.title?.toLowerCase().includes(animeId.toLowerCase())
          );
          
          if (animeInfo && animeInfo.seasons && animeInfo.seasons[season.number - 1]) {
            const seasonInfo = animeInfo.seasons[season.number - 1];
            
            if (seasonInfo.episodeCount && seasonInfo.episodeCount > 0) {
              
              const generatedEpisodes = Array.from({ length: seasonInfo.episodeCount }, (_, i) => ({
                id: `${animeId}-s${season.number}-e${i + 1}-universal`,
                episodeNumber: i + 1,
                title: `Épisode ${i + 1}`,
                language: 'VOSTFR',
                url: `${API_BASE_URL}/api/episode/${animeId}-episode-${i + 1}-vostfr`,
                available: true
              }));
              
              setEpisodes(generatedEpisodes);
              setSelectedSeason(season);
              setAvailableLanguages(['VOSTFR']);
              setSelectedLanguage('VOSTFR');
              setSelectedEpisode(generatedEpisodes[0]);
              await loadEpisodeSources(generatedEpisodes[0].id);
              
              setError(`${seasonInfo.episodeCount} épisodes générés depuis données authentiques du catalogue`);
              return;
            }
          }
        }
      }
    } catch (catalogueErr) {
    }
    
    // Étape 3: Utiliser progressInfo avec correction des numéros d'épisodes
    if (selectedAnime?.progressInfo?.totalEpisodes) {
      
      // Créer des épisodes temporaires pour la correction
      const tempEpisodes = [{
        id: 'temp',
        episodeNumber: 1,
        title: 'Episode 1',
        language: 'vostfr',
        url: '',
        available: true
      }];
      
      // Appliquer la correction des numéros d'épisodes
      const correctedEpisodes = correctEpisodeNumbers(animeId, season.number, tempEpisodes);
      
      if (correctedEpisodes.length > 0) {
        setEpisodes(correctedEpisodes);
        setSelectedSeason(season);
        setAvailableLanguages(['VOSTFR', 'VF']);
        setSelectedLanguage('VOSTFR');
        setSelectedEpisode(correctedEpisodes[0]);
        await loadEpisodeSources(correctedEpisodes[0].id);
        
        setError(`${correctedEpisodes.length} épisodes générés avec numérotation correcte (${correctedEpisodes[0].episodeNumber}-${correctedEpisodes[correctedEpisodes.length-1].episodeNumber})`);
        return;
      }
    }
    
    // Si tout échoue
    throw new Error(`Système universel: Aucun épisode détecté pour ${season.name}. Cet anime pourrait ne pas être disponible sur anime-sama.fr.`);
  };

  // Charger les épisodes d'une saison
  const loadSeasonEpisodes = async (season: Season) => {
    if (!selectedAnime) return;
    
    setLoading(true);
    setError(null);
    setCurrentView('player');
    
    // Reset des états pour éviter la confusion
    setEpisodes([]);
    setSelectedEpisode(null);
    setEpisodeDetails(null);
    
    try {
      const availLangs = await detectAvailableLanguages(selectedAnime.id, season.number);
      
      // Si système universel détecté, utiliser les endpoints de fallback intelligents
      if (availLangs.includes('UNIVERSAL')) {
        try {
          await loadEpisodesWithUniversalSystem(selectedAnime.id, season);
          return;
        } catch (universalError) {
          throw universalError;
        }
      }
      
      setAvailableLanguages(availLangs);
      
      let languageToUse = selectedLanguage;
      if (!availLangs.includes(selectedLanguage)) {
        languageToUse = availLangs[0] as 'VF' | 'VOSTFR';
        setSelectedLanguage(languageToUse);
      }
      
      const language = languageToUse.toLowerCase();
      const requestUrl = `${API_BASE_URL}/api/seasons?animeId=${selectedAnime.id}&season=${season.number}&language=${language}`;
      
      const response = await fetch(requestUrl, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(15000)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const apiResponse: ApiResponse<{
        animeId: string;
        season: number;
        language: string;
        episodes: Episode[];
        episodeCount: number;
      }> = await response.json();
      
      
      if (!apiResponse.success) {
        throw new Error(`API error: ${JSON.stringify(apiResponse)}`);
      }
      
      // CORRECTION 8: Épisodes Vides API - Fallback intelligent
      if (!apiResponse.data || !apiResponse.data.episodes || apiResponse.data.episodes.length === 0) {
        
        // Tenter plusieurs langues et méthodes
        const languages = ['VOSTFR', 'VF'];
        let validEpisodes = [];
        
        for (const lang of languages) {
          try {
            const langCode = lang.toLowerCase() === 'vf' ? 'vf' : 'vostfr';
            const response = await fetch(`${API_BASE_URL}/api/seasons?animeId=${selectedAnime.id}&season=${season.number}&language=${langCode}`);
            const data = await response.json();
            
            if (data.success && data.data && data.data.episodes && data.data.episodes.length > 0) {
              validEpisodes = data.data.episodes;
              setSelectedLanguage(lang as 'VF' | 'VOSTFR');
              break;
            }
          } catch (err) {
            // Continue to next language
          }
        }
        
        // Si aucun épisode trouvé, essayer endpoint content
        if (validEpisodes.length === 0) {
          try {
            const contentResponse = await fetch(`${API_BASE_URL}/api/content?animeId=${selectedAnime.id}&type=episodes`);
            const contentData = await contentResponse.json();
            
            if (contentData.success && contentData.data && contentData.data.length > 0) {
              validEpisodes = contentData.data;
            }
          } catch (contentErr) {
            // Continue to catalogue
          }
        }
        
        // Dernière tentative avec catalogue
        if (validEpisodes.length === 0) {
          try {
            const catalogueResponse = await fetch(`${API_BASE_URL}/api/catalogue?search=${selectedAnime.id}`);
            const catalogueData = await catalogueResponse.json();
            
            if (catalogueData.success && catalogueData.data) {
              const animeInfo = catalogueData.data.find((a: any) => a.id === selectedAnime.id);
              if (animeInfo && animeInfo.seasons && animeInfo.seasons[season.number - 1]) {
                const seasonInfo = animeInfo.seasons[season.number - 1];
                // Générer des épisodes basés sur episodeCount
                validEpisodes = Array.from({ length: seasonInfo.episodeCount }, (_, i) => ({
                  id: `${selectedAnime.id}-s${season.number}-e${i + 1}`,
                  episodeNumber: i + 1,
                  title: `Épisode ${i + 1}`,
                  language: 'VOSTFR',
                  url: '',
                  available: true
                }));
              }
            }
          } catch (catalogueErr) {
            // Final fallback failed
          }
        }
        
        if (validEpisodes.length === 0) {
          throw new Error(`Aucun épisode disponible pour ${season.name}. Cet anime pourrait ne pas être encore disponible.`);
        }
        
        // Continuer avec les épisodes trouvés - Appliquer correction numérotation
        const correctedValidEpisodes = correctEpisodeNumbers(selectedAnime.id, season.number, validEpisodes);
        
        setEpisodes(correctedValidEpisodes);
        setSelectedSeason(season);
        
        const firstEpisode = correctedValidEpisodes[0];
        setSelectedEpisode(firstEpisode);
        await loadEpisodeSources(firstEpisode.id);
        

        return;
      }
      
      // ✅ CORRECTION CRITIQUE: Appliquer la correction des numéros d'épisodes
      const correctedEpisodes = correctEpisodeNumbers(selectedAnime.id, season.number, apiResponse.data.episodes);
      
      setEpisodes(correctedEpisodes);
      setSelectedSeason(season);
      
      // Charger automatiquement le premier épisode
      const firstEpisode = correctedEpisodes[0];
      setSelectedEpisode(firstEpisode);
      await loadEpisodeSources(firstEpisode.id);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      
      // Revenir à la vue anime si échec total
      setCurrentView('anime');
      setSelectedSeason(null);
      setEpisodes([]);
      setSelectedEpisode(null);
      setEpisodeDetails(null);
    } finally {
      setLoading(false);
    }
  };

  // Système de chargement des sources selon documentation validée
  const loadEpisodeSources = async (episodeId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Générer l'ID d'épisode correct selon documentation: {anime}-episode-{numero}-{langue}
      let correctEpisodeId = episodeId;
      if (selectedAnime && selectedEpisode) {
        const lang = selectedLanguage.toLowerCase();
        correctEpisodeId = `${selectedAnime.id}-episode-${selectedEpisode.episodeNumber}-${lang}`;
      }
      
      // Essayer d'abord l'endpoint /api/episode/{episodeId} avec gestion d'erreurs robuste
      try {
        const response = await fetch(`${API_BASE_URL}/api/episode/${correctEpisodeId}`, {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          signal: AbortSignal.timeout(15000)
        }).catch(fetchError => {
          return null;
        });
        
        if (response && response.ok) {
          const apiResponse = await response.json().catch(jsonError => {
            // JSON parsing failed
            return null;
          });
          
          if (apiResponse && apiResponse.success && apiResponse.data) {
            // Optimiser les sources avec l'endpoint embed intégré
            const optimizedData = {
              ...apiResponse.data,
              sources: (apiResponse.data.sources || []).map((source: any, index: number) => ({
                ...source,
                serverName: `Serveur ${index + 1} - ${source.server}${source.quality ? ` (${source.quality})` : ''}`,
                embedUrl: `/api/embed/${correctEpisodeId}`,
                isEmbed: true,
                priority: index === 0 ? 'high' : 'normal'
              }))
            };
            
            setEpisodeDetails(optimizedData);
            setSelectedServer(0);
            
            // Historique de visionnage avec gestion d'erreurs
            if (selectedAnime && selectedEpisode) {
              try {
                const newHistory = { 
                  ...watchHistory, 
                  [selectedAnime.id]: selectedEpisode.episodeNumber 
                };
                setWatchHistory(newHistory);
                localStorage.setItem('animeWatchHistory', JSON.stringify(newHistory));
              } catch (historyError) {
                // Ignore history save errors
              }
            }
            
            return;
          }
        }
      } catch (apiError: any) {
        // Use embed fallback silently
      }
      
      // Fallback: utiliser directement l'endpoint embed
      const embedUrl = `/api/embed/${correctEpisodeId}`;
      const fallbackData = {
        id: correctEpisodeId,
        title: selectedEpisode?.title || 'Épisode',
        animeTitle: selectedAnime?.title || 'Anime',
        episodeNumber: selectedEpisode?.episodeNumber || 1,
        sources: [
          {
            url: embedUrl,
            server: 'Universal',
            serverName: 'Lecteur Universel - Système intégré',
            quality: 'HD',
            language: selectedLanguage,
            type: 'embed',
            serverIndex: 0,
            isEmbed: true,
            priority: 'high',
            embedUrl: embedUrl
          }
        ],
        availableServers: ['Universal'],
        url: embedUrl,
        embedUrl: embedUrl
      };
      
      setEpisodeDetails(fallbackData);
      setSelectedServer(0);

    } catch (err: any) {
      setError('Sources vidéo temporairement indisponibles');
    } finally {
      setLoading(false);
    }
  };

  // Navigation entre épisodes
  const navigateEpisode = async (direction: 'prev' | 'next') => {
    if (!selectedEpisode || episodes.length === 0) return;
    
    const currentIndex = episodes.findIndex(ep => ep.id === selectedEpisode.id);
    let newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    
    if (newIndex >= 0 && newIndex < episodes.length) {
      const newEpisode = episodes[newIndex];
      setSelectedEpisode(newEpisode);
      await loadEpisodeSources(newEpisode.id);
    }
  };

  // Fonction changeLanguage sans erreurs unhandledrejection
  const changeLanguage = async (newLanguage: 'VF' | 'VOSTFR') => {
    if (!selectedAnime || !selectedSeason) {
      return;
    }
    
    
    // Protection contre les changements multiples
    if (languageChangeInProgress) {
      return;
    }
    
    setLanguageChangeInProgress(true);
    setError(null);
    
    try {
      // Délai pour éviter les race conditions
      if (selectedLanguage !== newLanguage) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      setSelectedLanguage(newLanguage);
      
      
      // Utilisation du client API robuste avec gestion d'erreurs complète
      const data = await loadEpisodesWithRetry(
        selectedAnime.id, 
        selectedSeason, 
        newLanguage,
        3 // maxRetries
      ).catch(retryError => {
        // Gestion silencieuse des erreurs de retry
        return { success: false, data: { episodes: [] }, error: retryError.message };
      });
      
      
      // Extraction des épisodes selon le format de réponse
      let episodesData = [];
      if (data && data.success && data.data && Array.isArray(data.data.episodes)) {
        episodesData = data.data.episodes;
      } else if (Array.isArray(data)) {
        episodesData = data;
      } else if (data && data.data && Array.isArray(data.data)) {
        episodesData = data.data;
      }
      
      // Mise à jour d'état sécurisée
      if (episodesData && episodesData.length > 0) {
        // Appliquer les corrections d'épisodes selon la documentation
        const correctedEpisodes = correctEpisodeNumbers(selectedAnime.id, selectedSeason.number, episodesData);
        setEpisodes(correctedEpisodes);
        
        // Sélection du premier épisode
        const firstEpisode = correctedEpisodes[0];
        setSelectedEpisode(firstEpisode);
        
        // Chargement des détails de l'épisode avec gestion d'erreurs
        loadEpisodeSources(firstEpisode.id).catch(sourceError => {
          setError('Épisodes chargés mais sources vidéo indisponibles');
        });
        
        setLastSuccessfulLanguage(newLanguage);
        setRetryCount(0);
      } else {
        
        // Fallback vers l'autre langue avec gestion d'erreurs
        const fallbackLanguage = newLanguage === 'VF' ? 'VOSTFR' : 'VF';
        
        const fallbackData = await loadEpisodesWithRetry(
          selectedAnime.id, 
          selectedSeason, 
          fallbackLanguage,
          2 // moins de retry pour le fallback
        ).catch(fallbackError => {
          return { success: false, data: { episodes: [] }, error: fallbackError.message };
        });
        
        let fallbackEpisodes = [];
        if (fallbackData && fallbackData.success && fallbackData.data && Array.isArray(fallbackData.data.episodes)) {
          fallbackEpisodes = fallbackData.data.episodes;
        }
        
        if (fallbackEpisodes.length > 0) {
          const correctedEpisodes = correctEpisodeNumbers(selectedAnime.id, selectedSeason.number, fallbackEpisodes);
          setEpisodes(correctedEpisodes);
          setSelectedLanguage(fallbackLanguage);
          setError(`${newLanguage} indisponible - ${fallbackLanguage} chargé`);
        } else {
          setEpisodes([]);
          setError(`Aucun épisode disponible en ${newLanguage} ou ${fallbackLanguage}`);
        }
      }
      
    } catch (error: any) {
      setError(`Erreur lors du changement vers ${newLanguage}`);
    } finally {
      setLanguageChangeInProgress(false);
    }
  };;

  // Effet de recherche avec délai optimisé
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim() && currentView === 'search') {
        searchAnimes(searchQuery);
      }
    }, 800);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, currentView]);

  const currentSources = episodeDetails?.sources || [];
  const currentSource = currentSources[selectedServer];

  return (
    <MainLayout className="bg-black anime-sama-page">
      {/* Header exact anime-sama avec recherche intégrée */}
      <div className="sticky top-0 z-40" style={{ backgroundColor: '#000000', borderBottom: '1px solid #333' }}>
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center flex-1">
            {currentView !== 'search' && (
              <button 
                onClick={() => {
                  if (currentView === 'player') {
                    setCurrentView('anime');
                  } else if (currentView === 'anime') {
                    setCurrentView('search');
                    setSelectedAnime(null);
                  }
                }}
                className="mr-3 p-2 rounded" 
                style={{ backgroundColor: '#1a1a1a' }}
              >
                <ArrowLeft size={18} className="text-white" />
              </button>
            )}
            
            {currentView === 'search' ? (
              <div className="flex items-center flex-1">
                <div className="text-white font-bold text-lg mr-2">🔍</div>
                <input
                  type="text"
                  placeholder="Rechercher un anime..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-gray-800 text-white px-3 py-2 rounded text-sm border border-gray-700 focus:border-cyan-500 focus:outline-none"
                />
              </div>
            ) : (
              <div className="flex items-center">
                <div className="text-white font-bold text-lg mr-2">🔍</div>
                <span className="text-white font-medium text-sm uppercase tracking-wide">
                  {currentView === 'anime' ? 'APERÇU' : 
                   selectedAnime?.title || 'ANIME'}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 ml-3">
            <div className="text-white text-xl">🇹🇬</div>
          </div>
        </div>
      </div>

      {/* Page de recherche */}
      {currentView === 'search' && (
        <div className="p-4">


          {/* Résultats de recherche */}
          {searchResults.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {searchResults.map((anime) => (
                <div
                  key={anime.id}
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
                    {popularAnimes.map((anime) => (
                      <div
                        key={anime.id}
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
                          <div className="flex justify-between items-center mt-1">
                            <p className="text-gray-400 text-xs">{anime.status}</p>
                            <span className="text-cyan-400 text-xs">{anime.type}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Message de recherche */}
              <div className="text-center py-12 border-t border-gray-800">
                <div className="text-4xl mb-4">🔍</div>
                <h2 className="text-white text-xl font-bold mb-2">Recherchez votre anime</h2>
                <p className="text-gray-400 text-sm">Tapez le nom de l'anime que vous souhaitez regarder</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Page détails anime - APERÇU */}
      {currentView === 'anime' && selectedAnime && (
        <div className="p-0">
          {/* Image principale */}
          <div className="relative">
            <img
              src={selectedAnime.image}
              alt={selectedAnime.title}
              className="w-full h-64 object-cover"
            />
            <div 
              className="absolute inset-0"
              style={{ background: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.8) 100%)' }}
            />
            <div className="absolute bottom-4 left-4 right-4">
              <h1 className="text-white text-2xl font-bold mb-2">{selectedAnime.title}</h1>
              {/* Informations d'avancement authentiques */}
              {selectedAnime.progressInfo && (
                <div className="text-sm space-y-1">
                  <div>
                    <span className="text-white font-semibold">Avancement :</span>
                    <span className="text-gray-400 ml-2">{selectedAnime.progressInfo.advancement}</span>
                  </div>
                  <div>
                    <span className="text-white font-semibold">Correspondance :</span>
                    <span className="text-gray-400 ml-2">{selectedAnime.progressInfo.correspondence}</span>
                  </div>
                </div>
              )}
              
              {/* Indicateurs Films/Scans authentiques */}
              <div className="flex gap-3 mt-2">
                {selectedAnime.progressInfo?.hasFilms && (
                  <div className="text-blue-400 text-sm">📽️ Films disponibles</div>
                )}
                {selectedAnime.progressInfo?.hasScans && (
                  <div className="text-green-400 text-sm">📖 Scans manga disponibles</div>
                )}
              </div>
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="flex gap-2 p-4">
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm" style={{ backgroundColor: '#2a2a2a' }}>
              <span>⭐</span> Favoris
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm" style={{ backgroundColor: '#2a2a2a' }}>
              <span>👁</span> Watchlist
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm" style={{ backgroundColor: '#2a2a2a' }}>
              <span>✓</span> Vu
            </button>
          </div>

          {/* Section ANIME avec sagas, films et scans */}
          <div className="px-4 pb-4">
            <h2 className="text-white text-lg font-bold mb-4 uppercase tracking-wide">ANIME</h2>
            <div className="grid grid-cols-2 gap-3">
              {selectedAnime.seasons.map((season) => (
                <button
                  key={season.number}
                  onClick={() => loadSeasonEpisodes(season)}
                  className="relative overflow-hidden rounded-lg border-2 transition-all"
                  style={{ 
                    aspectRatio: '16/9',
                    borderColor: selectedSeason?.number === season.number ? '#3b82f6' : '#1e40af',
                    backgroundColor: '#1e40af'
                  }}
                >
                  <img
                    src={selectedAnime.image}
                    alt={season.name}
                    className="w-full h-full object-cover opacity-60"
                  />
                  <div 
                    className="absolute inset-0"
                    style={{ background: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.9) 100%)' }}
                  />
                  <div className="absolute bottom-2 left-2 right-2">
                    <div className="text-white text-sm font-bold text-left">{season.name}</div>
                  </div>
                </button>
              ))}
              
              {/* Films si disponibles */}
              {selectedAnime.progressInfo?.hasFilms && (
                <button
                  className="relative overflow-hidden rounded-lg border-2 transition-all"
                  style={{ 
                    aspectRatio: '16/9',
                    borderColor: '#dc2626',
                    backgroundColor: '#dc2626'
                  }}
                >
                  <img
                    src={selectedAnime.image}
                    alt="Films"
                    className="w-full h-full object-cover opacity-60"
                  />
                  <div 
                    className="absolute inset-0"
                    style={{ background: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.9) 100%)' }}
                  />
                  <div className="absolute bottom-2 left-2 right-2">
                    <div className="text-white text-sm font-bold text-left">📽️ Films</div>
                  </div>
                </button>
              )}
              
              {/* Scans si disponibles */}
              {selectedAnime.progressInfo?.hasScans && (
                <button
                  className="relative overflow-hidden rounded-lg border-2 transition-all"
                  style={{ 
                    aspectRatio: '16/9',
                    borderColor: '#16a34a',
                    backgroundColor: '#16a34a'
                  }}
                >
                  <img
                    src={selectedAnime.image}
                    alt="Scans"
                    className="w-full h-full object-cover opacity-60"
                  />
                  <div 
                    className="absolute inset-0"
                    style={{ background: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.9) 100%)' }}
                  />
                  <div className="absolute bottom-2 left-2 right-2">
                    <div className="text-white text-sm font-bold text-left">📖 Scans Manga</div>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Page lecteur - Interface exacte anime-sama */}
      {currentView === 'player' && selectedAnime && selectedSeason && (
        <div className="p-0 min-h-screen" style={{ backgroundColor: '#0a0a0a' }}>
          {/* Image avec titre superposé */}
          <div className="relative">
            <img
              src={selectedAnime.image}
              alt={selectedAnime.title}
              className="w-full h-48 object-cover"
            />
            <div 
              className="absolute inset-0"
              style={{ background: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.9) 100%)' }}
            />
            <div className="absolute bottom-4 left-4">
              <h1 className="text-white text-2xl font-bold uppercase tracking-wide">{selectedAnime.title}</h1>
              <h2 className="text-gray-400 text-lg uppercase tracking-wider font-medium">{selectedSeason.name}</h2>
            </div>
          </div>

          {/* Interface de contrôle */}
          <div className="p-4 space-y-6">
            {/* Drapeaux VF/VOSTFR - Style capture d'écran */}
            <div className="flex gap-3">
              {availableLanguages.map((lang) => (
                <button
                  key={lang}
                  onClick={() => debouncedLanguageChange(lang as 'VF' | 'VOSTFR')}
                  className="flex items-center justify-center w-16 h-12 rounded-lg border-2 transition-all"
                  style={{
                    backgroundColor: selectedLanguage === lang ? '#1e40af' : '#2a2a2a',
                    borderColor: selectedLanguage === lang ? '#3b82f6' : '#404040',
                    color: 'white'
                  }}
                >
                  <span className="font-bold text-sm">
                    {lang}
                  </span>
                </button>
              ))}
            </div>

            {/* Sélecteurs - Style exact de la capture */}
            <div className="grid grid-cols-2 gap-4">
              <select
                value={selectedEpisode?.id || ""}
                onChange={(e) => {
                  const episode = episodes.find(ep => ep.id === e.target.value);
                  if (episode) {
                    setSelectedEpisode(episode);
                    loadEpisodeSources(episode.id);
                  }
                }}
                className="w-full p-3 text-white rounded-lg text-sm font-bold border-2 uppercase"
                style={{ 
                  backgroundColor: '#1e40af', 
                  borderColor: '#3b82f6',
                  color: 'white'
                }}
              >
                {episodes.length > 0 ? (
                  episodes.map((episode) => (
                    <option key={episode.id} value={episode.id} style={{ backgroundColor: '#1e40af', color: 'white' }}>
                      EPISODE {episode.episodeNumber}
                    </option>
                  ))
                ) : (
                  <option value="" disabled style={{ backgroundColor: '#1e40af', color: 'white' }}>EPISODE 1</option>
                )}
              </select>

              <select
                value={selectedServer}
                onChange={(e) => setSelectedServer(Number(e.target.value))}
                className="w-full p-3 text-white rounded-lg text-sm font-bold border-2 uppercase"
                style={{ 
                  backgroundColor: '#1e40af', 
                  borderColor: '#3b82f6',
                  color: 'white'
                }}
              >
                {currentSources.length > 0 ? (
                  currentSources.map((source, index) => (
                    <option key={index} value={index} style={{ backgroundColor: '#1e40af', color: 'white' }}>
                      LECTEUR {index + 1}
                    </option>
                  ))
                ) : (
                  <option value={0} style={{ backgroundColor: '#1e40af', color: 'white' }}>LECTEUR 1</option>
                )}
              </select>
            </div>

            {/* Dernière sélection */}
            <div className="text-left">
              <span className="text-white font-bold text-sm">DERNIÈRE SÉLECTION : </span>
              <span className="text-gray-300 italic text-sm">
                {selectedEpisode ? `EPISODE ${selectedEpisode.episodeNumber}` : 'EPISODE 1'}
              </span>
            </div>

            {/* Navigation épisodes - Boutons circulaires style capture */}
            <div className="flex justify-center gap-6 py-2">
              <button
                onClick={() => navigateEpisode('prev')}
                disabled={!selectedEpisode || episodes.findIndex(ep => ep.id === selectedEpisode.id) === 0}
                className="flex items-center justify-center w-16 h-16 rounded-full text-white text-xl font-bold disabled:opacity-40 transition-all"
                style={{ backgroundColor: '#1e40af' }}
              >
                ←
              </button>
              
              <button
                onClick={() => {
                  if (selectedEpisode) {
                    loadEpisodeSources(selectedEpisode.id);
                  }
                }}
                className="flex items-center justify-center w-16 h-16 rounded-full text-white text-xl font-bold transition-all"
                style={{ backgroundColor: '#374151' }}
              >
                ↓
              </button>
              
              <button
                onClick={() => navigateEpisode('next')}
                disabled={!selectedEpisode || episodes.findIndex(ep => ep.id === selectedEpisode.id) === episodes.length - 1}
                className="flex items-center justify-center w-16 h-16 rounded-full text-white text-xl font-bold disabled:opacity-40 transition-all"
                style={{ backgroundColor: '#1e40af' }}
              >
                →
              </button>
            </div>

            {/* Message d'information - Style exact de la capture */}
            <div className="text-center py-4">
              <p className="text-white text-sm leading-relaxed">
                <span className="italic">Pub insistante ou vidéo indisponible ?</span><br />
                <span className="font-bold">Changez de lecteur.</span>
              </p>
            </div>



            {/* Zone lecteur vidéo avec contournement anime-sama.fr */}
            <div 
              className="w-full rounded-lg overflow-hidden relative" 
              style={{ backgroundColor: '#000', minHeight: '300px' }}
            >
              <style>{`
                /* CSS anti-blocage anime-sama.fr */
                iframe[src*="anime-sama"] {
                  filter: none !important;
                  opacity: 1 !important;
                  pointer-events: auto !important;
                }
                
                .blocked-content, .connection-error, .access-denied, .iframe-blocked {
                  display: none !important;
                }
                
                video, .video-container, .player-container {
                  display: block !important;
                  visibility: visible !important;
                  opacity: 1 !important;
                }
                
                .error-overlay, .blocked-message, .restriction-notice {
                  display: none !important;
                }
              `}</style>
              {(() => {
                // Debug: Afficher l'état des épisodes et sources
                console.log('Selected episode:', selectedEpisode);
                console.log('Episode details:', episodeDetails);
                console.log('Current video URL:', currentVideoUrl);
                
                const currentSources = episodeDetails?.sources || [];
                const currentSource = currentSources[selectedServer];
                
                // Afficher les épisodes si aucun épisode sélectionné
                if (!selectedEpisode && episodes.length > 0) {
                  return (
                    <div className="w-full p-4">
                      <h3 className="text-white text-lg mb-4">Épisodes disponibles:</h3>
                      <div className="grid grid-cols-4 gap-2">
                        {episodes.slice(0, 12).map((episode) => (
                          <button
                            key={episode.id}
                            onClick={() => {
                              setSelectedEpisode(episode);
                              loadEpisodeDetails(episode.id);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded text-sm"
                          >
                            Ep {episode.episodeNumber}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                }
                
                if (!selectedEpisode) return (
                  <div className="w-full h-64 flex items-center justify-center text-gray-500 text-sm">
                    Sélectionnez un épisode pour commencer la lecture
                  </div>
                );
                
                if (!currentSource && !currentVideoUrl) return (
                  <div className="w-full h-64 flex items-center justify-center text-gray-500 text-sm">
                    Chargement du lecteur...
                  </div>
                );
                
                const correctEpisodeId = selectedEpisode ? selectedEpisode.id : episodeDetails?.id || '';
                const embedUrl = process.env.NODE_ENV === 'development' 
                  ? `/api/embed/${correctEpisodeId}`
                  : `${API_BASE_URL}/api/embed/${correctEpisodeId}`;
                
                return (
                  <div className="relative w-full">
                    <iframe
                      id="video-player"
                      key={`${correctEpisodeId}-${selectedServer}-${selectedLanguage}`}
                      src={currentVideoUrl || embedUrl}
                      className="w-full h-64 md:h-80"
                      allowFullScreen
                      frameBorder="0"
                      sandbox="allow-scripts allow-same-origin allow-forms allow-presentation allow-popups allow-top-navigation"
                      referrerPolicy="no-referrer"
                      allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                      title={`Episode ${selectedEpisode?.episodeNumber} - ${selectedAnime.title}`}
                      style={{ 
                        border: 'none', 
                        display: 'block',
                        backgroundColor: '#000'
                      }}
                      onLoad={() => {
                        setError(null);
                        console.log(`Lecteur chargé: ${currentSource.server} - Episode ${selectedEpisode?.episodeNumber} (${selectedLanguage})`);
                      }}
                      onError={(e) => {
                        console.log('Erreur iframe, tentative fallback');
                        const target = e.currentTarget;
                        if (!target.src.includes('/api/embed/')) {
                          target.src = embedUrl;
                        }
                      }}
                    />
                    
                    {/* Overlay avec informations serveur */}
                    <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white text-xs p-2 rounded opacity-70 hover:opacity-100 transition-opacity">
                      {currentSource.server || `Serveur ${selectedServer + 1}`}
                      {currentSource.quality && ` (${currentSource.quality})`}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Navigation épisodes en bas - Répétition style capture */}
            <div className="flex justify-center gap-6 py-4">
              <button
                onClick={() => navigateEpisode('prev')}
                disabled={!selectedEpisode || episodes.findIndex(ep => ep.id === selectedEpisode.id) === 0}
                className="flex items-center justify-center w-16 h-16 rounded-full text-white text-xl font-bold disabled:opacity-40 transition-all"
                style={{ backgroundColor: '#1e40af' }}
              >
                ←
              </button>
              
              <button
                onClick={() => {
                  if (selectedEpisode) {
                    loadEpisodeSources(selectedEpisode.id);
                  }
                }}
                className="flex items-center justify-center w-16 h-16 rounded-full text-white text-xl font-bold transition-all"
                style={{ backgroundColor: '#374151' }}
              >
                ↓
              </button>
              
              <button
                onClick={() => navigateEpisode('next')}
                disabled={!selectedEpisode || episodes.findIndex(ep => ep.id === selectedEpisode.id) === episodes.length - 1}
                className="flex items-center justify-center w-16 h-16 rounded-full text-white text-xl font-bold disabled:opacity-40 transition-all"
                style={{ backgroundColor: '#1e40af' }}
              >
                →
              </button>
            </div>




          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
          <div className="p-4 rounded-lg" style={{ backgroundColor: '#1a1a1a' }}>
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-white text-sm">Chargement...</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="fixed bottom-4 left-4 right-4 p-3 rounded-lg z-50 status-message error">
          <p className="text-white text-sm">{error}</p>
          <button
            onClick={() => setError(null)}
            className="absolute top-2 right-2 text-white hover:text-gray-300"
          >
            ×
          </button>
        </div>
      )}
    </MainLayout>
  );
};

export default AnimeSamaPage;