
# Documentation Complète - Page Anime-Sama

## 🎯 Vue d'ensemble

La page Anime-Sama reproduit fidèlement l'interface et les fonctionnalités du site anime-sama.fr, permettant aux utilisateurs de rechercher, parcourir et regarder des animes directement dans l'application.

## 📁 Architecture des fichiers

### Fichiers principaux
- **`client/src/pages/anime-sama.tsx`** - Page principale Anime-Sama
- **`client/src/pages/anime-search.tsx`** - Page de recherche d'animes
- **`client/src/pages/watch.tsx`** - Lecteur vidéo avancé
- **`server/anime-sama-api.ts`** - Service API Anime-Sama
- **`server/routes.ts`** - Routes API pour les animes

## 🚀 Fonctionnalités implémentées

### ✅ Interface identique à anime-sama.fr
- **Design** : Fond noir (#000000) avec interface fidèle
- **Header** : Barre de recherche intégrée avec emoji 🔍
- **Navigation** : Boutons retour et indicateurs de vue
- **Drapeaux** : VF (🇫🇷) et VOSTFR (🇯🇵) avec sélection visuelle
- **Cartes** : Style bleu (#1e40af) pour les saisons/sagas
- **Lecteur** : Interface de contrôle complète

### ✅ Navigation utilisateur authentique
1. **Recherche** - Interface de recherche avec suggestions
2. **Aperçu** - Page détails avec informations anime
3. **Sélection saga** - Cartes bleues pour choisir la saison
4. **Sélection langue** - Drapeaux VF/VOSTFR interactifs
5. **Sélection épisode** - Dropdown style anime-sama
6. **Sélection serveur** - Multiples lecteurs disponibles
7. **Visionnage** - Lecteur iframe responsive

## 🔧 API Anime-Sama

### URL de base
```
https://api-anime-sama.onrender.com
```

### Endpoints utilisés

#### 1. Recherche d'animes
```
GET /api/search?query={terme}
```
**Exemple** : `/api/search?query=naruto`

#### 2. Animes populaires
```
GET /api/trending
```

#### 3. Détails d'un anime
```
GET /api/anime/{id}
```

#### 4. Épisodes d'une saison
```
GET /api/seasons?animeId={id}&season={num}&language={lang}
```

#### 5. Sources d'un épisode
```
GET /api/episode/{episodeId}
```

## 📱 États de l'interface

### Vue 'search' (Recherche)
- Barre de recherche active
- Résultats en grille
- Animes populaires si pas de recherche
- Historique de visionnage

### Vue 'anime' (Aperçu)
- Image principale avec gradient
- Informations de progression
- Boutons favoris/watchlist/vu
- Grille des saisons disponibles

### Vue 'player' (Lecteur)
- Image avec titre superposé
- Drapeaux de langue disponibles
- Dropdowns épisode et serveur
- Navigation précédent/suivant
- Lecteur vidéo iframe

## 🎮 Interactions utilisateur

### Recherche
```typescript
const searchAnimes = async (query: string) => {
  const response = await fetch(`${API_BASE}/api/search?query=${encodeURIComponent(query)}`);
  const apiResponse = await response.json();
  setSearchResults(apiResponse.data);
};
```

### Chargement anime
```typescript
const loadAnimeDetails = async (animeId: string) => {
  const response = await fetch(`${API_BASE}/api/anime/${animeId}`);
  const apiResponse = await response.json();
  setSelectedAnime(apiResponse.data);
  setCurrentView('anime');
};
```

### Chargement épisodes
```typescript
const loadSeasonEpisodes = async (season: Season) => {
  const language = selectedLanguage.toLowerCase();
  const response = await fetch(`${API_BASE}/api/seasons?animeId=${selectedAnime.id}&season=${season.number}&language=${language}`);
  const apiResponse = await response.json();
  setEpisodes(apiResponse.data.episodes);
};
```

## 🎨 Styles CSS intégrés

### Couleurs principales
- **Fond** : `#000000` (noir pur)
- **Cartes** : `#1a1a1a` (gris très foncé)
- **Saisons** : `#1e40af` (bleu anime-sama)
- **Bordures** : `#333333` (gris foncé)
- **Texte** : `#ffffff` (blanc)
- **Secondaire** : `#gray-400` (gris moyen)

### Layout responsive
```css
.grid-cols-2 md:grid-cols-3 lg:grid-cols-4
```

## 📊 Gestion des données

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
}

interface Episode {
  id: string;
  title: string;
  episodeNumber: number;
  url: string;
  language: string;
  available: boolean;
}
```

### État local
```typescript
const [currentView, setCurrentView] = useState<'search' | 'anime' | 'player'>('search');
const [searchQuery, setSearchQuery] = useState('');
const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
const [selectedAnime, setSelectedAnime] = useState<AnimeDetails | null>(null);
const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);
const [selectedLanguage, setSelectedLanguage] = useState<'VF' | 'VOSTFR'>('VOSTFR');
const [episodes, setEpisodes] = useState<Episode[]>([]);
const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
```

## 🔄 Gestion des erreurs

### Gestion réseau
```typescript
try {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const data = await response.json();
  if (!data.success) {
    throw new Error('API response error');
  }
} catch (err) {
  setError('Message d\'erreur utilisateur');
}
```

### Images de fallback
```typescript
onError={(e) => {
  const target = e.target as HTMLImageElement;
  target.src = 'https://via.placeholder.com/300x400/1a1a1a/ffffff?text=Image+Non+Disponible';
}}
```

## 📱 Fonctionnalités avancées

### Historique de visionnage
```typescript
const [watchHistory, setWatchHistory] = useState<{[key: string]: number}>({});

useEffect(() => {
  const savedHistory = localStorage.getItem('animeWatchHistory');
  if (savedHistory) {
    setWatchHistory(JSON.parse(savedHistory));
  }
}, []);
```

### Détection automatique des langues
```typescript
const detectAvailableLanguages = async (animeId: string, seasonNumber: number) => {
  const languages = [];
  // Test VF et VOSTFR
  // Retourne les langues disponibles
};
```

### Navigation entre épisodes
```typescript
const navigateEpisode = async (direction: 'prev' | 'next') => {
  const currentIndex = episodes.findIndex(ep => ep.id === selectedEpisode.id);
  const newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
  // Navigation logique
};
```

## 🎯 Messages utilisateur

### Feedback exact anime-sama
- **Chargement** : "Chargement..."
- **Pub/Indisponible** : "Pub insistante ou vidéo indisponible ? Changez de lecteur."
- **Aucune source** : "Aucune source {langue} disponible"
- **Dernière sélection** : "DERNIÈRE SÉLECTION : EPISODE {num}"

## 🚀 Pages liées

### anime-search.tsx
Page de recherche dédiée avec :
- Interface moderne avec animations Framer Motion
- Recherche en temps réel
- Navigation vers anime/{id}
- Gestion des erreurs réseau

### watch.tsx
Lecteur vidéo avancé avec :
- Contrôles personnalisés
- Progression de visionnage
- Sélection de serveurs
- Téléchargement d'épisodes
- Navigation entre épisodes

## 🔗 Intégration avec l'application

### Navigation depuis home.tsx
```typescript
<Link href="/anime-sama">
  <div className="anime-sama-button">
    Anime-Sama
  </div>
</Link>
```

### Routes dans App.tsx
```typescript
<Route path="/anime-sama">
  <ProtectedRoute>
    <AnimeSamaPage />
  </ProtectedRoute>
</Route>
```

## 📈 Performance et optimisation

### Recherche avec délai
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

### Chargement conditionnel
```typescript
{loading && (
  <div className="loading-overlay">
    <div className="spinner" />
    <p>Chargement...</p>
  </div>
)}
```

## 🎪 Comment tester

### Animes recommandés pour test
- **"naruto"** - Série populaire avec plusieurs saisons
- **"one piece"** - Longue série avec nombreux épisodes
- **"demon slayer"** - Anime récent avec bonne qualité
- **"attack on titan"** - Série complète

### Parcours de test complet
1. Ouvrir `/anime-sama`
2. Rechercher "naruto"
3. Cliquer sur le premier résultat
4. Sélectionner une saison dans les cartes bleues
5. Choisir VF ou VOSTFR
6. Sélectionner un épisode
7. Changer de lecteur si nécessaire
8. Tester la navigation précédent/suivant

## 🐛 Problèmes connus et solutions

### Sources vidéo indisponibles
**Solution** : Changer de lecteur via le dropdown serveur

### Langue non disponible
**Solution** : Detection automatique et fallback vers langue disponible

### Images manquantes
**Solution** : Placeholder automatique avec texte

### API lente
**Solution** : Indicateurs de chargement et timeouts

## 🔧 Maintenance

### Mise à jour de l'API
L'API `https://api-anime-sama.onrender.com` est maintenue séparément et peut nécessiter des ajustements en cas de changements sur anime-sama.fr.

### Ajout de nouvelles fonctionnalités
- Favoris persistants
- Historique détaillé
- Recommandations personnalisées
- Mode sombre/clair
- Téléchargement hors ligne

Cette documentation couvre tous les aspects de la page Anime-Sama et ses fonctionnalités liées. Elle sert de référence complète pour comprendre, maintenir et étendre le système.
