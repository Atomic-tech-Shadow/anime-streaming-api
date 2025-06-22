import React, { useState, useEffect, useRef, useCallback } from 'react';

// =====================================================
// INTERFACES ET TYPES CORRIGÉS
// =====================================================

interface Episode {
  id: string;
  episodeNumber: number;
  title: string;
  language: 'VF' | 'VOSTFR';
  seasonNumber: number;
  available: boolean;
  url: string;
  embedUrl: string;
}

interface Season {
  number: number;
  name: string;
  languages: ('VF' | 'VOSTFR')[];
  episodeCount: number;
  url: string;
}

interface Anime {
  id: string;
  title: string;
  description: string;
  image?: string;
  genres: string[];
  status: string;
  year: string;
  seasons: Season[];
  progressInfo?: {
    advancement: string;
    correspondence: string;
    totalEpisodes?: number;
    hasFilms?: boolean;
    hasScans?: boolean;
  };
}

interface EpisodeDetail {
  id: string;
  title: string;
  animeTitle?: string;
  episodeNumber: number;
  sources: StreamingSource[];
  availableServers: string[];
  url: string;
}

interface StreamingSource {
  url: string;
  server: string;
  quality: string;
  language: 'VF' | 'VOSTFR';
  type: 'iframe' | 'direct';
  serverIndex: number;
}

// =====================================================
// CACHE LOCAL POUR OPTIMISER LES PERFORMANCES
// =====================================================

class EpisodeCache {
  private cache = new Map<string, EpisodeDetail>();
  private seasonCache = new Map<string, Episode[]>();
  private animeCache = new Map<string, Anime>();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes
  private timestamps = new Map<string, number>();

  get(key: string): any | null {
    const timestamp = this.timestamps.get(key);
    if (!timestamp || Date.now() - timestamp > this.TTL) {
      this.cache.delete(key);
      this.seasonCache.delete(key);
      this.animeCache.delete(key);
      this.timestamps.delete(key);
      return null;
    }
    return this.cache.get(key) || this.seasonCache.get(key) || this.animeCache.get(key);
  }

  set(key: string, value: any): void {
    this.timestamps.set(key, Date.now());
    if (value.sources) {
      this.cache.set(key, value);
    } else if (Array.isArray(value)) {
      this.seasonCache.set(key, value);
    } else {
      this.animeCache.set(key, value);
    }
  }

  clear(): void {
    this.cache.clear();
    this.seasonCache.clear();
    this.animeCache.clear();
    this.timestamps.clear();
  }
}

const episodeCache = new EpisodeCache();

// =====================================================
// UTILITAIRES API AVEC RETRY ET GESTION D'ERREURS
// =====================================================

const API_BASE = 'https://api-anime-sama.onrender.com';

interface FetchOptions {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
}

const fetchWithRetry = async (url: string, options: FetchOptions = {}): Promise<any> => {
  const { maxRetries = 3, retryDelay = 1000, timeout = 30000 } = options;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error: any) {
      console.error(`Tentative ${attempt}/${maxRetries} échouée:`, error);
      
      if (attempt === maxRetries) {
        throw new Error(`Échec après ${maxRetries} tentatives: ${error.message}`);
      }
      
      // Délai exponentiel entre les tentatives
      await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt - 1)));
    }
  }
};

// =====================================================
// COMPOSANT PRINCIPAL CORRIGÉ
// =====================================================

export const AnimeSamaPageFixed: React.FC = () => {
  // États principaux
  const [anime, setAnime] = useState<Anime | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [episodeDetail, setEpisodeDetail] = useState<EpisodeDetail | null>(null);
  const [currentLanguage, setCurrentLanguage] = useState<'VF' | 'VOSTFR'>('VOSTFR');
  
  // États de chargement et d'erreur
  const [loading, setLoading] = useState(false);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [loadingSources, setLoadingSources] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Références pour éviter les race conditions
  const currentRequestRef = useRef<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);

  // =====================================================
  // FONCTIONS UTILITAIRES CORRIGÉES
  // =====================================================

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  const handleError = useCallback((error: any, context: string) => {
    console.error(`Erreur ${context}:`, error);
    
    let userMessage = 'Une erreur inattendue s\'est produite.';
    
    if (error.message?.includes('timeout') || error.message?.includes('aborted')) {
      userMessage = 'Délai de connexion dépassé. Vérifiez votre connexion internet.';
    } else if (error.message?.includes('500')) {
      userMessage = 'Erreur serveur temporaire. Veuillez réessayer dans quelques instants.';
    } else if (error.message?.includes('404')) {
      userMessage = 'Contenu non trouvé. Cet anime ou épisode n\'existe peut-être plus.';
    } else if (error.message?.includes('429')) {
      userMessage = 'Trop de requêtes. Veuillez patienter avant de réessayer.';
    }
    
    setError(userMessage);
  }, []);

  // =====================================================
  // CHARGEMENT ANIME AVEC CACHE
  // =====================================================

  const loadAnimeDetails = useCallback(async (animeId: string) => {
    const cacheKey = `anime_${animeId}`;
    const cached = episodeCache.get(cacheKey);
    
    if (cached) {
      setAnime(cached);
      return cached;
    }

    setLoading(true);
    resetError();

    try {
      const response = await fetchWithRetry(`${API_BASE}/api/anime/${animeId}`);
      
      if (response.success && response.data) {
        episodeCache.set(cacheKey, response.data);
        setAnime(response.data);
        return response.data;
      } else {
        throw new Error(response.message || 'Impossible de charger les détails de l\'anime');
      }
    } catch (error) {
      handleError(error, 'chargement anime');
      return null;
    } finally {
      setLoading(false);
    }
  }, [handleError, resetError]);

  // =====================================================
  // CHARGEMENT SAISON AVEC GESTION OPTIMISÉE
  // =====================================================

  const loadSeasonEpisodes = useCallback(async (
    animeId: string, 
    seasonNumber: number, 
    language: 'VF' | 'VOSTFR'
  ): Promise<Episode[]> => {
    const cacheKey = `season_${animeId}_${seasonNumber}_${language}`;
    const cached = episodeCache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    setLoadingEpisodes(true);
    
    try {
      const response = await fetchWithRetry(
        `${API_BASE}/api/seasons?animeId=${animeId}&season=${seasonNumber}&language=${language.toLowerCase()}`
      );
      
      if (response.success && response.data?.episodes) {
        const episodesList = response.data.episodes;
        episodeCache.set(cacheKey, episodesList);
        return episodesList;
      } else {
        throw new Error(response.message || 'Aucun épisode trouvé pour cette saison');
      }
    } catch (error) {
      handleError(error, 'chargement épisodes');
      return [];
    } finally {
      setLoadingEpisodes(false);
    }
  }, [handleError]);

  // =====================================================
  // CHARGEMENT SOURCES ÉPISODE CORRIGÉ (PLUS DE RACE CONDITIONS)
  // =====================================================

  const loadEpisodeSources = useCallback(async (episodeToLoad: Episode): Promise<void> => {
    // Générer un ID unique pour cette requête
    const requestId = `${episodeToLoad.id}_${Date.now()}`;
    currentRequestRef.current = requestId;

    // Annuler la requête précédente si elle existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();

    const cacheKey = `episode_${episodeToLoad.id}`;
    const cached = episodeCache.get(cacheKey);
    
    if (cached) {
      // Vérifier si cette requête est toujours la plus récente
      if (currentRequestRef.current === requestId) {
        setEpisodeDetail(cached);
        setSelectedEpisode(episodeToLoad);
      }
      return;
    }

    setLoadingSources(true);
    resetError();

    try {
      console.log(`Chargement sources pour épisode ${episodeToLoad.episodeNumber}:`, episodeToLoad.id);
      
      const response = await fetchWithRetry(`${API_BASE}/api/episode/${episodeToLoad.id}`);
      
      // Vérifier si cette requête est toujours pertinente
      if (currentRequestRef.current !== requestId) {
        console.log('Requête obsolète, ignorée');
        return;
      }
      
      if (response.success && response.data) {
        // Validation de cohérence
        const loadedEpisodeNumber = response.data.episodeNumber;
        const expectedEpisodeNumber = episodeToLoad.episodeNumber;
        
        if (loadedEpisodeNumber !== expectedEpisodeNumber) {
          console.warn(`Incohérence détectée: attendu ${expectedEpisodeNumber}, reçu ${loadedEpisodeNumber}`);
        }
        
        episodeCache.set(cacheKey, response.data);
        setEpisodeDetail(response.data);
        setSelectedEpisode(episodeToLoad);
        
        console.log(`Sources chargées pour épisode ${expectedEpisodeNumber}`);
      } else {
        throw new Error(response.message || 'Impossible de charger les sources de l\'épisode');
      }
    } catch (error) {
      // Ne pas afficher l'erreur si la requête a été annulée
      if (currentRequestRef.current === requestId) {
        handleError(error, 'chargement sources');
      }
    } finally {
      if (currentRequestRef.current === requestId) {
        setLoadingSources(false);
      }
    }
  }, [handleError, resetError]);

  // =====================================================
  // CHANGEMENT DE SAISON CORRIGÉ
  // =====================================================

  const handleSeasonChange = useCallback(async (season: Season) => {
    setSelectedSeason(season);
    setSelectedEpisode(null);
    setEpisodeDetail(null);
    
    console.log(`Changement vers ${season.name}, langue: ${currentLanguage}`);
    
    const episodesList = await loadSeasonEpisodes(anime?.id || '', season.number, currentLanguage);
    setEpisodes(episodesList);
    
    // Sélectionner automatiquement le premier épisode
    if (episodesList.length > 0) {
      const firstEpisode = episodesList[0];
      await loadEpisodeSources(firstEpisode);
    }
  }, [anime?.id, currentLanguage, loadSeasonEpisodes, loadEpisodeSources]);

  // =====================================================
  // CHANGEMENT DE LANGUE CORRIGÉ (PLUS DE PERTE D'ÉPISODE)
  // =====================================================

  const handleLanguageChange = useCallback(async (newLanguage: 'VF' | 'VOSTFR') => {
    if (!selectedSeason || !anime) {
      setCurrentLanguage(newLanguage);
      return;
    }

    const currentEpisodeNumber = selectedEpisode?.episodeNumber;
    
    console.log(`Changement langue vers ${newLanguage}, épisode actuel: ${currentEpisodeNumber}`);
    
    setCurrentLanguage(newLanguage);
    
    // Recharger les épisodes avec la nouvelle langue
    const episodesList = await loadSeasonEpisodes(anime.id, selectedSeason.number, newLanguage);
    setEpisodes(episodesList);
    
    // Retrouver le même épisode dans la nouvelle langue
    if (currentEpisodeNumber) {
      const sameEpisode = episodesList.find(ep => ep.episodeNumber === currentEpisodeNumber);
      if (sameEpisode) {
        await loadEpisodeSources(sameEpisode);
        console.log(`Épisode ${currentEpisodeNumber} retrouvé en ${newLanguage}`);
      } else {
        console.warn(`Épisode ${currentEpisodeNumber} non disponible en ${newLanguage}`);
        // Prendre le premier épisode disponible
        if (episodesList.length > 0) {
          await loadEpisodeSources(episodesList[0]);
        }
      }
    } else if (episodesList.length > 0) {
      await loadEpisodeSources(episodesList[0]);
    }
  }, [selectedSeason, anime, selectedEpisode?.episodeNumber, loadSeasonEpisodes, loadEpisodeSources]);

  // =====================================================
  // SÉLECTION D'ÉPISODE CORRIGÉE
  // =====================================================

  const handleEpisodeSelect = useCallback(async (episode: Episode) => {
    console.log(`Sélection épisode ${episode.episodeNumber}:`, episode.id);
    await loadEpisodeSources(episode);
  }, [loadEpisodeSources]);

  // =====================================================
  // NAVIGATION ÉPISODES
  // =====================================================

  const navigateToEpisode = useCallback(async (direction: 'prev' | 'next') => {
    if (!selectedEpisode || episodes.length === 0) return;
    
    const currentIndex = episodes.findIndex(ep => ep.id === selectedEpisode.id);
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    
    if (newIndex >= 0 && newIndex < episodes.length) {
      await handleEpisodeSelect(episodes[newIndex]);
    }
  }, [selectedEpisode, episodes, handleEpisodeSelect]);

  // =====================================================
  // INITIALISATION AU MONTAGE DU COMPOSANT
  // =====================================================

  useEffect(() => {
    const initializeAnime = async () => {
      // Exemple avec One Piece - remplacez par l'ID de votre choix
      const animeId = 'one-piece';
      
      const animeData = await loadAnimeDetails(animeId);
      if (animeData && animeData.seasons.length > 0) {
        // Prendre la dernière saison par défaut
        const lastSeason = animeData.seasons[animeData.seasons.length - 1];
        await handleSeasonChange(lastSeason);
      }
    };

    initializeAnime();
  }, [loadAnimeDetails, handleSeasonChange]);

  // =====================================================
  // NETTOYAGE AU DÉMONTAGE
  // =====================================================

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // =====================================================
  // RENDU JSX RESPONSIVE CORRIGÉ
  // =====================================================

  if (loading) {
    return (
      <div className="anime-loading">
        <div className="loading-spinner"></div>
        <p>Chargement de l'anime...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="anime-error">
        <h3>Erreur</h3>
        <p>{error}</p>
        <button onClick={resetError} className="retry-button">
          Réessayer
        </button>
      </div>
    );
  }

  if (!anime) {
    return (
      <div className="anime-not-found">
        <p>Anime non trouvé</p>
      </div>
    );
  }

  return (
    <div className="anime-sama-page">
      {/* En-tête anime responsive */}
      <header className="anime-header">
        <div className="anime-poster">
          {anime.image && (
            <img 
              src={anime.image} 
              alt={anime.title}
              loading="lazy"
            />
          )}
        </div>
        
        <div className="anime-info">
          <h1>{anime.title}</h1>
          <p className="anime-description">{anime.description}</p>
          
          <div className="anime-meta">
            <span className="anime-year">{anime.year}</span>
            <span className="anime-status">{anime.status}</span>
            {anime.progressInfo && (
              <span className="anime-progress">{anime.progressInfo.advancement}</span>
            )}
          </div>
          
          <div className="anime-genres">
            {anime.genres.map((genre, index) => (
              <span key={index} className="genre-tag">{genre}</span>
            ))}
          </div>
        </div>
      </header>

      {/* Contrôles de navigation */}
      <div className="anime-controls">
        {/* Sélecteur de saison */}
        <div className="season-selector">
          <label>Saison:</label>
          <select 
            value={selectedSeason?.number || ''} 
            onChange={(e) => {
              const season = anime.seasons.find(s => s.number === parseInt(e.target.value));
              if (season) handleSeasonChange(season);
            }}
            disabled={loadingEpisodes}
          >
            {anime.seasons.map((season) => (
              <option key={season.number} value={season.number}>
                {season.name}
              </option>
            ))}
          </select>
        </div>

        {/* Sélecteur de langue */}
        <div className="language-selector">
          <label>Langue:</label>
          <div className="language-buttons">
            <button 
              className={currentLanguage === 'VF' ? 'active' : ''}
              onClick={() => handleLanguageChange('VF')}
              disabled={loadingEpisodes}
            >
              VF
            </button>
            <button 
              className={currentLanguage === 'VOSTFR' ? 'active' : ''}
              onClick={() => handleLanguageChange('VOSTFR')}
              disabled={loadingEpisodes}
            >
              VOSTFR
            </button>
          </div>
        </div>
      </div>

      {/* Liste des épisodes */}
      <div className="episodes-section">
        <h3>
          Épisodes {selectedSeason?.name} ({currentLanguage})
          {loadingEpisodes && <span className="loading-indicator">Chargement...</span>}
        </h3>
        
        {episodes.length > 0 ? (
          <div className="episodes-grid">
            {episodes.map((episode) => (
              <button
                key={episode.id}
                className={`episode-card ${selectedEpisode?.id === episode.id ? 'selected' : ''}`}
                onClick={() => handleEpisodeSelect(episode)}
                disabled={!episode.available || loadingSources}
              >
                <span className="episode-number">Ép. {episode.episodeNumber}</span>
                <span className="episode-title">{episode.title}</span>
                {!episode.available && <span className="unavailable">Indisponible</span>}
              </button>
            ))}
          </div>
        ) : (
          <p className="no-episodes">Aucun épisode disponible</p>
        )}
      </div>

      {/* Navigation épisodes */}
      {selectedEpisode && (
        <div className="episode-navigation">
          <button 
            onClick={() => navigateToEpisode('prev')}
            disabled={loadingSources || episodes.findIndex(ep => ep.id === selectedEpisode.id) === 0}
          >
            Précédent
          </button>
          
          <span className="current-episode">
            Épisode {selectedEpisode.episodeNumber} - {selectedEpisode.title}
          </span>
          
          <button 
            onClick={() => navigateToEpisode('next')}
            disabled={loadingSources || episodes.findIndex(ep => ep.id === selectedEpisode.id) === episodes.length - 1}
          >
            Suivant
          </button>
        </div>
      )}

      {/* Lecteur vidéo */}
      {episodeDetail && (
        <div className="video-player-section">
          <h3>
            {loadingSources ? 'Chargement des sources...' : 'Lecture'}
          </h3>
          
          {loadingSources ? (
            <div className="loading-video">
              <div className="loading-spinner"></div>
              <p>Préparation de la vidéo...</p>
            </div>
          ) : episodeDetail.sources.length > 0 ? (
            <div className="video-container">
              <iframe
                src={episodeDetail.sources[0].url}
                title={`${episodeDetail.animeTitle} - Épisode ${episodeDetail.episodeNumber}`}
                allowFullScreen
                loading="lazy"
              />
              
              {/* Sources alternatives */}
              {episodeDetail.sources.length > 1 && (
                <div className="alternative-sources">
                  <h4>Sources alternatives:</h4>
                  <div className="sources-list">
                    {episodeDetail.sources.slice(1).map((source, index) => (
                      <a 
                        key={index}
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="source-link"
                      >
                        {source.server} ({source.quality})
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="no-sources">
              <p>Aucune source disponible pour cet épisode</p>
              <button onClick={() => loadEpisodeSources(selectedEpisode!)}>
                Réessayer
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AnimeSamaPageFixed;