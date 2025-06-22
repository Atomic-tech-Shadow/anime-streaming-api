# Documentation Complète - Architecture Anime Sama

## 🎯 Vue d'ensemble

Le système Anime Sama implémente une reproduction fidèle du site anime-sama.fr avec trois pages principales : recherche, détails et lecteur. L'architecture utilise l'API Anime-Sama pour récupérer les données et offre une navigation fluide entre les différentes vues.

## 📁 Architecture des fichiers

### Structure principale
```
client/src/pages/
├── anime-sama.tsx     # Page principale avec 3 vues intégrées
├── watch.tsx          # Lecteur vidéo avancé (alternatif)
└── anime.tsx          # Page détails alternative

server/
├── anime-sama-api.ts  # Service API Anime-Sama
└── routes.ts          # Routes API backend
```

## 🏗️ Architecture de la page principale (anime-sama.tsx)

### Système de vues multiples
La page `anime-sama.tsx` utilise un système de vues dynamiques contrôlé par l'état `currentView`:

```typescript
const [currentView, setCurrentView] = useState<'search' | 'anime' | 'player'>('search');
```

#### Vue 1: Recherche (`search`)
- Interface de recherche avec barre intégrée dans le header
- Affichage des animes populaires par défaut
- Résultats de recherche en temps réel avec délai optimisé (800ms)
- Grid responsive pour les cartes d'anime

#### Vue 2: Détails (`anime`)
- Page "APERÇU" avec image principale et dégradé
- Informations d'avancement et correspondance
- Boutons d'action (Favoris, Watchlist, Vu)
- Section "ANIME" avec cartes bleues pour les saisons

#### Vue 3: Lecteur (`player`)
- Interface de visionnage complète
- Sélecteurs de langue avec drapeaux (VF/VOSTFR)
- Dropdowns pour épisodes et serveurs
- Lecteur iframe intégré

## 🔄 Flux de navigation

### Parcours utilisateur type
1. **Recherche** → Saisie du nom d'anime
2. **Sélection** → Clic sur un anime pour voir les détails
3. **Choix saison** → Clic sur une carte bleue de saison
4. **Configuration** → Sélection langue, épisode, serveur
5. **Visionnage** → Lecture dans le lecteur intégré

### Transitions entre vues
```typescript
// Recherche → Détails
loadAnimeDetails(animeId) → setCurrentView('anime')

// Détails → Lecteur  
loadSeasonEpisodes(season) → setCurrentView('player')

// Navigation retour via header
```

## 🎨 Interface utilisateur

### Header adaptatif
```typescript
// Vue recherche: Barre de recherche active
{currentView === 'search' ? (
  <input placeholder="Rechercher un anime..." />
) : (
  <span>{currentView === 'anime' ? 'APERÇU' : selectedAnime?.title}</span>
)}
```

### Système de couleurs
- Fond principal: `#000000` (noir pur)
- Cartes: `#1a1a1a` (gris très foncé)
- Boutons: `#2a2a2a` (gris foncé)
- Saisons: `#1e40af` (bleu anime-sama)
- Erreurs: `#dc2626` (rouge)

### Drapeaux de langue
- VF: 🇫🇷 avec fond bleu `#1e40af`
- VOSTFR: 🇯🇵 avec fond rouge `#dc2626`
- Sélection visuelle avec bordure blanche

## 🔌 Intégration API

### Service principal (anime-sama-api.ts)
```typescript
class AnimeSamaService {
  private baseUrl = 'https://api-anime-sama.onrender.com';
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  
  // Méthodes principales avec retry et cache
  async searchAnime(query: string): Promise<SearchResult[]> {
    const cacheKey = `search:${query}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;
    
    const response = await this.fetchWithRetry(`${this.baseUrl}/api/search?query=${encodeURIComponent(query)}`);
    const apiResponse = await response.json();
    
    if (!apiResponse.success) {
      throw new Error(apiResponse.error || 'Erreur API');
    }
    
    this.setCachedData(cacheKey, apiResponse.data, 300000);
    return apiResponse.data;
  }
  
  async getAnimeById(animeId: string): Promise<AnimeDetails> {
    const cacheKey = `anime:${animeId}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;
    
    const response = await this.fetchWithRetry(`${this.baseUrl}/api/anime/${animeId}`);
    const apiResponse = await response.json();
    
    if (!apiResponse.success) {
      throw new Error(apiResponse.error || 'Erreur API');
    }
    
    this.setCachedData(cacheKey, apiResponse.data, 600000);
    return apiResponse.data;
  }
  
  async getSeasonEpisodes(animeId: string, season: number, language: 'vf' | 'vostfr'): Promise<Episode[]> {
    const cacheKey = `episodes:${animeId}:${season}:${language}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;
    
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/api/seasons?animeId=${animeId}&season=${season}&language=${language}`
    );
    const apiResponse = await response.json();
    
    if (!apiResponse.success) {
      throw new Error(`Épisodes ${language.toUpperCase()} non disponibles`);
    }
    
    this.setCachedData(cacheKey, apiResponse.data.episodes, 300000);
    return apiResponse.data.episodes;
  }
  
  async getEpisodeDetails(episodeId: string): Promise<EpisodeDetails> {
    const cacheKey = `episode:${episodeId}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;
    
    const response = await this.fetchWithRetry(`${this.baseUrl}/api/episode/${episodeId}`);
    const apiResponse = await response.json();
    
    if (!apiResponse.success || !apiResponse.data.sources.length) {
      throw new Error('Sources vidéo non disponibles');
    }
    
    this.setCachedData(cacheKey, apiResponse.data, 180000);
    return apiResponse.data;
  }
  
  async getTrendingAnime(): Promise<SearchResult[]> {
    const cacheKey = 'trending';
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;
    
    const response = await this.fetchWithRetry(`${this.baseUrl}/api/trending`);
    const apiResponse = await response.json();
    
    if (!apiResponse.success) {
      throw new Error('Erreur lors du chargement des animes populaires');
    }
    
    this.setCachedData(cacheKey, apiResponse.data, 600000);
    return apiResponse.data;
  }
  
  // Méthode de retry avec délai exponentiel
  private async fetchWithRetry(url: string, maxRetries = 3): Promise<Response> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(url, { 
          timeout: 10000,
          headers: { 'Cache-Control': 'no-cache' }
        });
        if (response.ok) return response;
        throw new Error(`HTTP ${response.status}`);
      } catch (err) {
        if (i === maxRetries - 1) throw err;
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }
    throw new Error('Échec après retry');
  }
  
  // Gestion du cache
  private getCachedData(key: string) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }
  
  private setCachedData(key: string, data: any, ttl = 300000) {
    this.cache.set(key, { data, timestamp: Date.now(), ttl });
  }
}
```

### Endpoints utilisés
- `GET /api/search?query=` - Recherche d'animes
- `GET /api/anime/{id}` - Détails d'un anime
- `GET /api/seasons?animeId={id}&season={num}&language={lang}` - Épisodes d'une saison
- `GET /api/episode/{id}` - Sources d'un épisode
- `GET /api/trending` - Animes populaires

### Gestion des erreurs corrigée
```typescript
try {
  const response = await fetch(url);
  const apiResponse: ApiResponse<T> = await response.json();
  if (!apiResponse.success) {
    throw new Error(apiResponse.error || 'Erreur API');
  }
  return apiResponse.data;
} catch (err) {
  console.error('Erreur API:', err);
  setError(err instanceof Error ? err.message : 'Erreur inconnue');
  return fallbackValue;
}
```

## 📊 Gestion des états

### États principaux avec protection race conditions
```typescript
// Navigation
const [currentView, setCurrentView] = useState<'search' | 'anime' | 'player'>('search');

// Données
const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
const [selectedAnime, setSelectedAnime] = useState<AnimeDetails | null>(null);
const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);
const [episodes, setEpisodes] = useState<Episode[]>([]);

// Lecture
const [selectedLanguage, setSelectedLanguage] = useState<'VF' | 'VOSTFR'>('VOSTFR');
const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
const [selectedServer, setSelectedServer] = useState<number>(0);
const [episodeDetails, setEpisodeDetails] = useState<EpisodeDetails | null>(null);

// Interface avec protection
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
const [languageChangeInProgress, setLanguageChangeInProgress] = useState(false);
const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
```

### Historique de visionnage
```typescript
const [watchHistory, setWatchHistory] = useState<{[key: string]: number}>({});
const [videoProgress, setVideoProgress] = useState<{[key: string]: number}>({});

// Sauvegarde locale sécurisée
useEffect(() => {
  try {
    const savedHistory = localStorage.getItem('animeWatchHistory');
    if (savedHistory) {
      setWatchHistory(JSON.parse(savedHistory));
    }
  } catch (err) {
    console.error('Erreur lecture historique:', err);
  }
}, []);

// Sauvegarde automatique
useEffect(() => {
  try {
    localStorage.setItem('animeWatchHistory', JSON.stringify(watchHistory));
  } catch (err) {
    console.error('Erreur sauvegarde historique:', err);
  }
}, [watchHistory]);
```

## 🎬 Système de lecture

### Détection des langues disponibles corrigée
```typescript
const detectAvailableLanguages = async (animeId: string, seasonNumber: number): Promise<('VF' | 'VOSTFR')[]> => {
  const languages: ('VF' | 'VOSTFR')[] = [];
  
  // Test VF avec timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const vfResponse = await fetch(
      `${API_BASE}/api/seasons?animeId=${animeId}&season=${seasonNumber}&language=vf`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);
    
    const vfData = await vfResponse.json();
    if (vfData.success && vfData.data.episodes.length > 0) {
      languages.push('VF');
    }
  } catch (err) {
    console.log('VF non disponible pour cette saison');
  }
  
  // Test VOSTFR avec timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const vostfrResponse = await fetch(
      `${API_BASE}/api/seasons?animeId=${animeId}&season=${seasonNumber}&language=vostfr`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);
    
    const vostfrData = await vostfrResponse.json();
    if (vostfrData.success && vostfrData.data.episodes.length > 0) {
      languages.push('VOSTFR');
    }
  } catch (err) {
    console.log('VOSTFR non disponible pour cette saison');
  }
  
  return languages;
};
```

### Chargement des sources vidéo avec retry
```typescript
const loadEpisodeSources = async (episodeId: string) => {
  setLoading(true);
  setError(null);
  
  try {
    const response = await fetch(`${API_BASE}/api/episode/${episodeId}`);
    const apiResponse: ApiResponse<EpisodeDetails> = await response.json();
    
    if (!apiResponse.success) {
      throw new Error(apiResponse.error || 'Erreur lors du chargement des sources');
    }
    
    if (!apiResponse.data.sources || apiResponse.data.sources.length === 0) {
      throw new Error('Aucune source vidéo disponible pour cet épisode');
    }
    
    setEpisodeDetails(apiResponse.data);
    setSelectedServer(0);
  } catch (err) {
    console.error('Erreur chargement sources:', err);
    setError(err instanceof Error ? err.message : 'Impossible de charger les sources vidéo');
    setEpisodeDetails(null);
  } finally {
    setLoading(false);
  }
};
```

### Lecteur iframe avec gestion d'erreurs
```typescript
// Lecteur vidéo intégré avec fallback
{currentSource ? (
  <div className="relative rounded-lg overflow-hidden" style={{ backgroundColor: '#000' }}>
    <iframe
      src={currentSource.url}
      className="w-full h-64 md:h-80 lg:h-96"
      allowFullScreen
      frameBorder="0"
      title={`${episodeDetails?.title} - ${currentSource.server}`}
      onError={() => setError('Erreur de chargement vidéo')}
      onLoad={() => setError(null)}
    />
  </div>
) : (
  <div className="bg-gray-900 rounded-lg p-8 text-center h-64 md:h-80 lg:h-96 flex items-center justify-center">
    <p className="text-gray-400">Aucune source vidéo disponible</p>
  </div>
)}
```

### Navigation entre épisodes sécurisée
```typescript
const navigateEpisode = async (direction: 'prev' | 'next') => {
  if (!selectedEpisode || episodes.length === 0 || loading) return;
  
  const currentIndex = episodes.findIndex(ep => ep.id === selectedEpisode.id);
  if (currentIndex === -1) return;
  
  let newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
  
  if (newIndex >= 0 && newIndex < episodes.length) {
    const newEpisode = episodes[newIndex];
    setSelectedEpisode(newEpisode);
    await loadEpisodeSources(newEpisode.id);
    
    // Sauvegarder la progression
    setWatchHistory(prev => ({
      ...prev,
      [selectedAnime?.id || '']: newEpisode.episodeNumber
    }));
  }
};
```

## 🔧 Fonctionnalités avancées

### Recherche optimisée avec annulation
```typescript
useEffect(() => {
  // Annuler la recherche précédente
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }
  
  const timeoutId = setTimeout(() => {
    if (searchQuery.trim() && currentView === 'search') {
      searchAnimes(searchQuery);
    }
  }, 800);
  
  setSearchTimeout(timeoutId);
  
  return () => {
    if (timeoutId) clearTimeout(timeoutId);
  };
}, [searchQuery, currentView]);
```

### Changement de langue dynamique sécurisé
```typescript
const changeLanguage = async (newLanguage: 'VF' | 'VOSTFR') => {
  if (!selectedSeason || !selectedAnime || 
      selectedLanguage === newLanguage || 
      languageChangeInProgress) {
    return;
  }
  
  setLanguageChangeInProgress(true);
  setError(null);
  
  // Sauvegarder l'état actuel pour rollback
  const previousLanguage = selectedLanguage;
  const previousEpisode = selectedEpisode;
  
  try {
    setSelectedLanguage(newLanguage);
    
    const language = newLanguage.toLowerCase() as 'vf' | 'vostfr';
    const response = await fetch(
      `${API_BASE}/api/seasons?animeId=${selectedAnime.id}&season=${selectedSeason.number}&language=${language}`
    );
    const apiResponse = await response.json();
    
    if (!apiResponse.success || !apiResponse.data.episodes.length) {
      throw new Error(`Aucun épisode ${newLanguage} disponible`);
    }
    
    setEpisodes(apiResponse.data.episodes);
    
    // Trouver l'épisode équivalent ou prendre le premier
    const equivalentEpisode = apiResponse.data.episodes.find((ep: Episode) => 
      ep.episodeNumber === previousEpisode?.episodeNumber
    ) || apiResponse.data.episodes[0];
    
    setSelectedEpisode(equivalentEpisode);
    await loadEpisodeSources(equivalentEpisode.id);
    
  } catch (err) {
    // Rollback en cas d'erreur
    setSelectedLanguage(previousLanguage);
    setSelectedEpisode(previousEpisode);
    setError(err instanceof Error ? err.message : `Impossible de charger les épisodes ${newLanguage}`);
    console.error('Erreur changement langue:', err);
  } finally {
    setLanguageChangeInProgress(false);
  }
};
```

## 📱 Responsive Design

### Grid adaptatif
```typescript
// Recherche et animes populaires
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">

// Saisons dans la vue détails
<div className="grid grid-cols-2 gap-3">

// Contrôles du lecteur
<div className="grid grid-cols-2 gap-4">
```

### Tailles d'écran
- Mobile: 2 colonnes
- Tablette: 3 colonnes  
- Desktop: 4 colonnes
- Hauteur lecteur: h-64 md:h-80 lg:h-96

## 🔄 Alternatives et pages supplémentaires

### Page watch.tsx (Alternative)
Lecteur vidéo avancé avec:
- Contrôles de lecture complets
- Gestion du temps et volume
- Mode plein écran
- Suivi de progression
- Mutation pour sauvegarder l'avancement

### Page anime.tsx (Alternative)
Page de détails simplifiée avec:
- Header avec retour
- Informations de base
- Navigation simplifiée

## 🛠️ Configuration backend

### Routes API (routes.ts)
```typescript
// Routes Anime (si implémentées)
app.get('/api/anime/search', searchAnime);
app.get('/api/anime/:id', getAnimeDetails);
app.get('/api/anime/:id/episodes', getEpisodes);
app.put('/api/anime/progress', updateProgress);
```

### Service API intégré
```typescript
import { animeSamaService } from "./anime-sama-api";

// Utilisation dans les routes avec gestion d'erreurs
try {
  const results = await animeSamaService.searchAnime(query);
  const anime = await animeSamaService.getAnimeById(id);
} catch (error) {
  console.error('Erreur service API:', error);
  throw error;
}
```

## 📋 Types et interfaces

### Structures de données principales corrigées
```typescript
interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  meta?: {
    timestamp: string;
    cached: boolean;
    ttl?: number;
  };
}

interface SearchResult {
  id: string;
  title: string;
  url: string;
  type: string;
  status?: string;
  image?: string;
  year?: string;
  genres?: string[];
}

interface AnimeDetails {
  id: string;
  title: string;
  description: string;
  image?: string;
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
  languages: ('VF' | 'VOSTFR')[];
  episodeCount: number;
  url: string;
}

interface Episode {
  id: string;
  title: string;
  episodeNumber: number;
  url: string;
  language?: 'VF' | 'VOSTFR';
  available: boolean;
}

interface EpisodeDetails {
  id: string;
  title: string;
  animeTitle?: string;
  episodeNumber: number;
  sources: VideoSource[];
  availableServers: string[];
  url: string;
}

interface VideoSource {
  url: string;
  server: string;
  quality: string;
  language: 'VF' | 'VOSTFR';
  type: 'iframe' | 'direct';
  serverIndex: number;
}
```

## 🎯 Points clés d'implémentation

### Fidélité à l'original
- Fond noir pur (#000000)
- Interface exacte avec emoji 🔍
- Cartes bleues pour les saisons
- Drapeaux VF/VOSTFR
- Messages d'erreur contextuels

### Performance
- Recherche avec délai (800ms)
- États optimisés
- Gestion d'erreur robuste
- Chargement conditionnel
- Cache intelligent avec TTL

### Expérience utilisateur
- Navigation fluide entre vues
- Historique de visionnage
- Messages d'état clairs
- Interface responsive
- Protection contre les race conditions
- Retry automatique en cas d'erreur

Cette architecture offre une reproduction fidèle et fonctionnelle du site anime-sama.fr avec une intégration API complète, une correspondance exacte des épisodes, et une expérience utilisateur optimisée sans bugs.