# Documentation des Pages Anime

## Vue d'ensemble
Cette documentation couvre les trois fichiers principaux de la fonctionnalité anime de l'application :
- `anime.tsx` - Page de visionnage détaillée d'un anime
- `anime-sama.tsx` - Page de recherche et navigation principale
- `anime-search.tsx` - Page de recherche avancée avec filtres

---

## 1. `anime.tsx` - Page de Visionnage

### Description
Page principale pour visionner un anime spécifique avec lecteur vidéo intégré, sélection de saisons, épisodes et serveurs.

### Interfaces TypeScript

```typescript
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
```

### État des Hooks

```typescript
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
```

### API Endpoints Utilisés
- `GET /api/anime/{id}` - Récupère les détails de l'anime
- `GET /api/seasons` - Récupère les épisodes d'une saison
- `GET /api/episode/{episodeId}` - Récupère les sources vidéo d'un épisode

### Fonctionnalités Principales
1. **Lecteur vidéo intégré** avec iframe responsive
2. **Sélection de saison** avec dropdown animé
3. **Sélection de langue** (VF/VOSTFR)
4. **Liste des épisodes** avec pagination
5. **Choix de serveur** pour la lecture vidéo
6. **Navigation** avec bouton retour vers l'accueil
7. **Gestion d'erreurs** et états de chargement

### Configuration API
```typescript
const API_BASE = 'https://api-anime-sama.onrender.com';
```

---

## 2. `anime-sama.tsx` - Page de Recherche Principale

### Description
Interface principale pour rechercher et parcourir les animes avec navigation par catégories et aperçu détaillé.

### Interfaces TypeScript

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
  correspondence?: string;
  advancement?: string;
}
```

### État des Hooks

```typescript
const [searchQuery, setSearchQuery] = useState('');
const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
const [currentView, setCurrentView] = useState<'search' | 'anime'>('search');
const [selectedAnime, setSelectedAnime] = useState<AnimeDetails | null>(null);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
```

### Fonctionnalités Principales
1. **Barre de recherche** avec debounce intégré
2. **Grid de résultats** avec images et métadonnées
3. **Page de détails** avec informations complètes
4. **Navigation fluide** entre recherche et détails
5. **Gestion d'erreurs** avec messages utilisateur
6. **Design responsive** pour mobile et desktop

### Vues Disponibles
- **Vue recherche** : Liste des résultats avec filtrage
- **Vue anime** : Aperçu détaillé avec saisons et informations

---

## 3. `anime-search.tsx` - Page de Recherche Avancée

### Description
Page de recherche avancée avec filtres et options de tri pour une navigation plus précise.

### Fonctionnalités Principales
1. **Recherche avancée** avec filtres multiples
2. **Tri des résultats** par popularité, date, note
3. **Filtrage par genre** et statut
4. **Pagination** des résultats
5. **Vue liste/grille** commutable
6. **Sauvegarde des préférences** de recherche

### Interface de Recherche
```typescript
interface SearchFilters {
  genre?: string[];
  status?: string;
  year?: string;
  type?: string;
  sortBy?: 'popularity' | 'date' | 'rating' | 'title';
  sortOrder?: 'asc' | 'desc';
}
```

---

## Configuration Générale

### Dépendances Principales
- **React** avec hooks modernes
- **Wouter** pour le routing
- **Framer Motion** pour les animations
- **Lucide React** pour les icônes
- **TypeScript** pour le typage strict

### Styling
- **Tailwind CSS** pour le styling
- **Theme sombre** par défaut
- **Animations fluides** avec Framer Motion
- **Design responsive** adaptatif

### Gestion d'État
- **useState** pour l'état local des composants
- **useEffect** pour les effets de bord et API calls
- **useParams** pour récupérer les paramètres d'URL

### API Backend
- **Base URL** : `https://api-anime-sama.onrender.com`
- **Authentification** : Non requise pour la consultation
- **Format** : JSON avec gestion d'erreurs standardisée

---

## Flux de Navigation

1. **Page d'accueil** → `anime-sama.tsx` (recherche)
2. **Résultats de recherche** → `anime.tsx` (visionnage)
3. **Recherche avancée** → `anime-search.tsx` (filtres)

### URLs de Routing
- `/anime-sama` - Page de recherche principale
- `/anime/:id` - Page de visionnage d'un anime
- `/anime-search` - Page de recherche avancée

---

## Sécurité et Performance

### Bonnes Pratiques Implémentées
1. **Validation des données** avec TypeScript
2. **Gestion d'erreurs** robuste avec try/catch
3. **États de chargement** pour une UX fluide
4. **Debounce** sur les recherches pour limiter les requêtes
5. **Lazy loading** des images et contenus
6. **Cache des résultats** pour éviter les requêtes répétées

### Optimisations
- **Pagination** pour limiter les données chargées
- **Images optimisées** avec lazy loading
- **Composants React.memo** pour éviter les re-renders
- **Cleanup des effets** avec useEffect cleanup