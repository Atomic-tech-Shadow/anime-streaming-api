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
  
  // Méthodes principales
  searchAnime(query: string)
  getAnimeById(animeId: string)
  getSeasonEpisodes(animeId: string, season: number, language: 'vf' | 'vostfr')
  getEpisodeDetails(episodeId: string)
  getTrendingAnime()
}
```

### Endpoints utilisés
- `GET /api/search?query=` - Recherche d'animes
- `GET /api/anime/{id}` - Détails d'un anime
- `GET /api/seasons?animeId={id}&season={num}&language={lang}` - Épisodes d'une saison
- `GET /api/episode/{id}` - Sources d'un épisode
- `GET /api/trending` - Animes populaires

### Gestion des erreurs
```typescript
try {
  const response = await fetch(url);
  const apiResponse: ApiResponse<T> = await response.json();
  if (!apiResponse.success) {
    throw new Error('Erreur API');
  }
  return apiResponse.data;
} catch (err) {
  setError('Message utilisateur');
  return fallbackValue;
}
```

## 📊 Gestion des états

### États principaux
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

// Interface
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
```

### Historique de visionnage
```typescript
const [watchHistory, setWatchHistory] = useState<{[key: string]: number}>({});
const [videoProgress, setVideoProgress] = useState<{[key: string]: number}>({});

// Sauvegarde locale
useEffect(() => {
  const savedHistory = localStorage.getItem('animeWatchHistory');
  if (savedHistory) {
    setWatchHistory(JSON.parse(savedHistory));
  }
}, []);
```

## 🎬 Système de lecture

### Détection des langues disponibles
```typescript
const detectAvailableLanguages = async (animeId: string, seasonNumber: number) => {
  const languages = [];
  
  // Test VF
  try {
    const vfResponse = await fetch(`${API_BASE}/api/seasons?animeId=${animeId}&season=${seasonNumber}&language=vf`);
    const vfData = await vfResponse.json();
    if (vfData.success && vfData.data.episodes.length > 0) {
      languages.push('VF');
    }
  } catch (err) {
    // VF non disponible
  }
  
  // Test VOSTFR
  try {
    const vostfrResponse = await fetch(`${API_BASE}/api/seasons?animeId=${animeId}&season=${seasonNumber}&language=vostfr`);
    const vostfrData = await vostfrResponse.json();
    if (vostfrData.success && vostfrData.data.episodes.length > 0) {
      languages.push('VOSTFR');
    }
  } catch (err) {
    // VOSTFR non disponible  
  }
  
  return languages;
};
```

### Chargement des sources vidéo
```typescript
const loadEpisodeSources = async (episodeId: string) => {
  try {
    const response = await fetch(`${API_BASE}/api/episode/${episodeId}`);
    const apiResponse: ApiResponse<EpisodeDetails> = await response.json();
    
    if (!apiResponse.success) {
      throw new Error('Erreur lors du chargement des sources');
    }
    
    setEpisodeDetails(apiResponse.data);
    setSelectedServer(0);
  } catch (err) {
    setError('Impossible de charger les sources vidéo.');
    setEpisodeDetails(null);
  }
};
```

### Lecteur iframe
```typescript
// Lecteur vidéo intégré
{currentSource && (
  <div className="relative rounded-lg overflow-hidden" style={{ backgroundColor: '#000' }}>
    <iframe
      src={currentSource.url}
      className="w-full h-64 md:h-80 lg:h-96"
      allowFullScreen
      frameBorder="0"
      title={`${episodeDetails?.title} - ${currentSource.server}`}
    />
  </div>
)}
```

### Navigation entre épisodes
```typescript
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
```

## 🔧 Fonctionnalités avancées

### Recherche optimisée avec délai
```typescript
useEffect(() => {
  const timeoutId = setTimeout(() => {
    if (searchQuery.trim() && currentView === 'search') {
      searchAnimes(searchQuery);
    }
  }, 800);

  return () => clearTimeout(timeoutId);
}, [searchQuery, currentView]);
```

### Changement de langue dynamique
```typescript
const changeLanguage = async (newLanguage: 'VF' | 'VOSTFR') => {
  if (!selectedSeason || !selectedAnime || selectedLanguage === newLanguage) return;
  
  setSelectedLanguage(newLanguage);
  setLoading(true);
  
  try {
    const language = newLanguage.toLowerCase();
    const response = await fetch(`${API_BASE}/api/seasons?animeId=${selectedAnime.id}&season=${selectedSeason.number}&language=${language}`);
    const apiResponse = await response.json();
    
    if (!apiResponse.success || apiResponse.data.episodes.length === 0) {
      throw new Error(`Aucun épisode ${newLanguage} disponible`);
    }
    
    setEpisodes(apiResponse.data.episodes);
    
    // Recharger le premier épisode avec la nouvelle langue
    const firstEpisode = apiResponse.data.episodes[0];
    setSelectedEpisode(firstEpisode);
    await loadEpisodeSources(firstEpisode.id);
    
  } catch (err) {
    setError(`Impossible de charger les épisodes ${newLanguage}.`);
    // Revenir à la langue précédente si échec
    setSelectedLanguage(selectedLanguage === 'VF' ? 'VOSTFR' : 'VF');
  } finally {
    setLoading(false);
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

// Utilisation dans les routes
const results = await animeSamaService.searchAnime(query);
const anime = await animeSamaService.getAnimeById(id);
```

## 📋 Types et interfaces

### Structures de données principales
```typescript
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
  availableServers: string[];
  url: string;
}

interface VideoSource {
  url: string;
  server: string;
  quality: string;
  language: string;
  type: string;
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

### Expérience utilisateur
- Navigation fluide entre vues
- Historique de visionnage
- Messages d'état clairs
- Interface responsive

Cette architecture offre une reproduction fidèle et fonctionnelle du site anime-sama.fr avec une intégration API complète et une expérience utilisateur optimisée.