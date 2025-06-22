// CODE FRONTEND CORRIGÉ - Page Anime-Sama
// Date: 22 juin 2025
// Status: Tous problèmes critiques résolus

import React, { useState, useEffect } from 'react';

// Types corrigés
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
  languages: string[];
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
  sources: any[];
  availableServers: string[];
  url: string;
}

// API Service corrigé - utilise l'API locale
const API_BASE = 'http://localhost:5000'; // API locale fonctionnelle

const apiService = {
  // Récupérer détails anime
  async getAnimeDetails(animeId: string): Promise<Anime | null> {
    try {
      const response = await fetch(`${API_BASE}/api/anime/${animeId}`);
      const data = await response.json();
      return data.success ? data.data : null;
    } catch (error) {
      console.error('Erreur API anime:', error);
      return null;
    }
  },

  // NOUVEAU - Récupérer épisodes d'une saison (RÉSOUT LE PROBLÈME MAJEUR)
  async getSeasonEpisodes(animeId: string, seasonNumber: number, language: 'VF' | 'VOSTFR'): Promise<Episode[]> {
    try {
      const response = await fetch(`${API_BASE}/api/seasons?animeId=${animeId}&season=${seasonNumber}&language=${language}`);
      const data = await response.json();
      return data.success ? data.data.episodes : [];
    } catch (error) {
      console.error('Erreur API saison:', error);
      return [];
    }
  },

  // Récupérer sources d'un épisode
  async getEpisodeSources(episodeId: string): Promise<EpisodeDetail | null> {
    try {
      const response = await fetch(`${API_BASE}/api/episode/${episodeId}`);
      const data = await response.json();
      return data || null;
    } catch (error) {
      console.error('Erreur API épisode:', error);
      return null;
    }
  }
};

// Composant principal corrigé
export const AnimeSamaPage: React.FC = () => {
  // États
  const [selectedAnime, setSelectedAnime] = useState<Anime | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [episodeDetails, setEpisodeDetails] = useState<EpisodeDetail | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<'VF' | 'VOSTFR'>('VOSTFR');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // CORRECTION MAJEURE - Synchronisation automatique episodes/selectedEpisode
  useEffect(() => {
    if (episodes.length > 0 && selectedSeason && !selectedEpisode) {
      const firstEpisode = episodes[0];
      setSelectedEpisode(firstEpisode);
      loadEpisodeSources(firstEpisode.id);
    }
  }, [episodes, selectedSeason]);

  // Charger anime au démarrage
  useEffect(() => {
    loadAnime('one-piece'); // Anime par défaut
  }, []);

  // Charger détails anime
  const loadAnime = async (animeId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const anime = await apiService.getAnimeDetails(animeId);
      if (anime) {
        setSelectedAnime(anime);
        // Sélectionner la première saison automatiquement
        if (anime.seasons.length > 0) {
          const firstSeason = anime.seasons[0];
          setSelectedSeason(firstSeason);
          await loadSeasonEpisodes(anime.id, firstSeason.number, selectedLanguage);
        }
      } else {
        setError('Anime non trouvé');
      }
    } catch (err) {
      setError('Erreur lors du chargement de l\'anime');
    } finally {
      setLoading(false);
    }
  };

  // CORRECTION MAJEURE - Charger épisodes d'une saison
  const loadSeasonEpisodes = async (animeId: string, seasonNumber: number, language: 'VF' | 'VOSTFR') => {
    setLoading(true);
    setError(null);
    
    try {
      const episodesList = await apiService.getSeasonEpisodes(animeId, seasonNumber, language);
      setEpisodes(episodesList);
      
      if (episodesList.length === 0) {
        setError(`Aucun épisode trouvé pour la saison ${seasonNumber} en ${language}`);
      }
    } catch (err) {
      setError('Erreur lors du chargement des épisodes');
      setEpisodes([]);
    } finally {
      setLoading(false);
    }
  };

  // CORRECTION MAJEURE - Changement de saison
  const handleSeasonChange = async (season: Season) => {
    if (!selectedAnime) return;
    
    setSelectedSeason(season);
    setSelectedEpisode(null); // Reset épisode sélectionné
    setEpisodeDetails(null); // Reset détails épisode
    
    await loadSeasonEpisodes(selectedAnime.id, season.number, selectedLanguage);
  };

  // CORRECTION MAJEURE - Changement de langue
  const handleLanguageChange = async (newLanguage: 'VF' | 'VOSTFR') => {
    setSelectedLanguage(newLanguage);
    
    if (selectedAnime && selectedSeason) {
      // Recharger les épisodes avec la nouvelle langue
      await loadSeasonEpisodes(selectedAnime.id, selectedSeason.number, newLanguage);
    }
  };

  // Charger sources d'un épisode
  const loadEpisodeSources = async (episodeId: string) => {
    try {
      const details = await apiService.getEpisodeSources(episodeId);
      setEpisodeDetails(details);
    } catch (err) {
      console.error('Erreur chargement sources:', err);
    }
  };

  // Sélectionner un épisode
  const handleEpisodeSelect = (episode: Episode) => {
    setSelectedEpisode(episode);
    loadEpisodeSources(episode.id);
  };

  // Navigation épisodes
  const navigateEpisode = (direction: 'prev' | 'next') => {
    if (!selectedEpisode || episodes.length === 0) return;
    
    const currentIndex = episodes.findIndex(ep => ep.id === selectedEpisode.id);
    let newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    
    if (newIndex >= 0 && newIndex < episodes.length) {
      handleEpisodeSelect(episodes[newIndex]);
    }
  };

  // Render
  if (loading && !selectedAnime) {
    return (
      <div className="anime-sama-page loading">
        <div className="loading-spinner">Chargement...</div>
      </div>
    );
  }

  if (error && !selectedAnime) {
    return (
      <div className="anime-sama-page error">
        <div className="error-message">{error}</div>
        <button onClick={() => loadAnime('one-piece')}>Réessayer</button>
      </div>
    );
  }

  if (!selectedAnime) {
    return <div className="anime-sama-page">Aucun anime sélectionné</div>;
  }

  return (
    <div className="anime-sama-page">
      {/* Header anime */}
      <div className="anime-header">
        <h1>{selectedAnime.title}</h1>
        <div className="anime-info">
          <p>{selectedAnime.description}</p>
          <div className="anime-meta">
            <span>Status: {selectedAnime.status}</span>
            <span>Année: {selectedAnime.year}</span>
            <span>Genres: {selectedAnime.genres.join(', ')}</span>
            {selectedAnime.progressInfo && (
              <span>
                {selectedAnime.progressInfo.totalEpisodes} épisodes - {selectedAnime.progressInfo.correspondence}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Sélecteur de langue */}
      <div className="language-selector">
        <button
          className={`lang-btn ${selectedLanguage === 'VF' ? 'active' : ''}`}
          onClick={() => handleLanguageChange('VF')}
        >
          🇫🇷 VF
        </button>
        <button
          className={`lang-btn ${selectedLanguage === 'VOSTFR' ? 'active' : ''}`}
          onClick={() => handleLanguageChange('VOSTFR')}
        >
          🇯🇵 VOSTFR
        </button>
      </div>

      {/* Sélecteur de saisons */}
      <div className="season-selector">
        <h3>Saisons disponibles</h3>
        <div className="seasons-grid">
          {selectedAnime.seasons.map(season => (
            <button
              key={season.number}
              className={`season-btn ${selectedSeason?.number === season.number ? 'active' : ''}`}
              onClick={() => handleSeasonChange(season)}
            >
              {season.name}
            </button>
          ))}
        </div>
      </div>

      {/* État de chargement */}
      {loading && (
        <div className="loading-section">
          <div className="spinner">Chargement des épisodes...</div>
        </div>
      )}

      {/* Erreur */}
      {error && (
        <div className="error-section">
          <div className="error-message">{error}</div>
        </div>
      )}

      {/* Sélecteur d'épisodes */}
      {episodes.length > 0 && (
        <div className="episode-selector">
          <h3>
            {selectedSeason?.name} - {episodes.length} épisodes ({selectedLanguage})
          </h3>
          <div className="episodes-grid">
            {episodes.map(episode => (
              <button
                key={episode.id}
                className={`episode-btn ${selectedEpisode?.id === episode.id ? 'active' : ''}`}
                onClick={() => handleEpisodeSelect(episode)}
              >
                Episode {episode.episodeNumber}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Lecteur vidéo */}
      {selectedEpisode && (
        <div className="video-section">
          <div className="video-header">
            <h3>
              {selectedAnime.title} - Episode {selectedEpisode.episodeNumber} ({selectedLanguage})
            </h3>
            <div className="video-controls">
              <button 
                onClick={() => navigateEpisode('prev')}
                disabled={episodes.findIndex(ep => ep.id === selectedEpisode.id) === 0}
              >
                ← Précédent
              </button>
              <button 
                onClick={() => navigateEpisode('next')}
                disabled={episodes.findIndex(ep => ep.id === selectedEpisode.id) === episodes.length - 1}
              >
                Suivant →
              </button>
            </div>
          </div>
          
          <div className="video-player">
            <iframe
              src={selectedEpisode.embedUrl}
              width="100%"
              height="500px"
              frameBorder="0"
              allowFullScreen
              allow="autoplay; fullscreen"
              title={`${selectedAnime.title} - Episode ${selectedEpisode.episodeNumber}`}
            />
          </div>

          {/* Informations épisode */}
          {episodeDetails && (
            <div className="episode-info">
              <p>Serveurs disponibles: {episodeDetails.availableServers.join(', ')}</p>
              <p>Sources: {episodeDetails.sources.length}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Styles CSS intégrés (reproduction anime-sama.fr)
const styles = `
.anime-sama-page {
  background: #000000;
  color: #ffffff;
  min-height: 100vh;
  padding: 20px;
  font-family: Arial, sans-serif;
}

.anime-header {
  text-align: center;
  margin-bottom: 30px;
}

.anime-header h1 {
  color: #ffffff;
  font-size: 2.5em;
  margin-bottom: 15px;
}

.anime-info {
  background: #1a1a1a;
  padding: 20px;
  border-radius: 10px;
  margin: 20px 0;
}

.anime-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  justify-content: center;
  margin-top: 15px;
}

.anime-meta span {
  background: #333;
  padding: 5px 10px;
  border-radius: 5px;
  font-size: 0.9em;
}

.language-selector {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin: 30px 0;
}

.lang-btn {
  background: #2a2a2a;
  color: white;
  border: 2px solid #444;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1.1em;
  transition: all 0.3s ease;
}

.lang-btn:hover {
  background: #3a3a3a;
  border-color: #666;
}

.lang-btn.active {
  background: #1e40af;
  border-color: #3b82f6;
  box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
}

.season-selector, .episode-selector {
  margin: 30px 0;
}

.season-selector h3, .episode-selector h3 {
  text-align: center;
  color: #ffffff;
  margin-bottom: 20px;
}

.seasons-grid, .episodes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px;
  max-width: 1000px;
  margin: 0 auto;
}

.episodes-grid {
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
}

.season-btn, .episode-btn {
  background: #2a2a2a;
  color: white;
  border: 1px solid #444;
  padding: 10px;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.season-btn:hover, .episode-btn:hover {
  background: #3a3a3a;
  border-color: #666;
}

.season-btn.active, .episode-btn.active {
  background: #1e40af;
  border-color: #3b82f6;
}

.loading-section, .error-section {
  text-align: center;
  padding: 20px;
  margin: 20px 0;
}

.spinner, .loading-spinner {
  border: 3px solid #333;
  border-top: 3px solid #1e40af;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  animation: spin 1s linear infinite;
  margin: 0 auto;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-message {
  color: #ff6b6b;
  background: #2a1a1a;
  padding: 10px;
  border-radius: 5px;
  margin: 10px 0;
}

.video-section {
  margin: 40px 0;
  background: #1a1a1a;
  padding: 20px;
  border-radius: 10px;
}

.video-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 10px;
}

.video-controls {
  display: flex;
  gap: 10px;
}

.video-controls button {
  background: #1e40af;
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 5px;
  cursor: pointer;
}

.video-controls button:disabled {
  background: #666;
  cursor: not-allowed;
}

.video-controls button:hover:not(:disabled) {
  background: #3b82f6;
}

.video-player {
  position: relative;
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
}

.episode-info {
  margin-top: 15px;
  padding: 10px;
  background: #2a2a2a;
  border-radius: 5px;
  text-align: center;
  font-size: 0.9em;
}

@media (max-width: 768px) {
  .anime-header h1 {
    font-size: 2em;
  }
  
  .video-header {
    flex-direction: column;
    text-align: center;
  }
  
  .seasons-grid, .episodes-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  }
}
`;

export default AnimeSamaPage;