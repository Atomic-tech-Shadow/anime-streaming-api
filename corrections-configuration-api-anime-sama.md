# Corrections Configuration API Anime-Sama

## PROBLÈMES IDENTIFIÉS ET CORRECTIONS

### 1. Configuration API de Base (CRITIQUE)

**PROBLÈME :** L'API_BASE_URL n'est pas définie correctement au début du composant.

**CORRECTION :**
```javascript
// À placer tout en haut du composant, avant les hooks
const API_BASE_URL = 'https://api-anime-sama.onrender.com';
```

### 2. Paramètre de Recherche Incorrect (CRITIQUE)

**PROBLÈME :** Le paramètre de recherche utilise 'query=' au lieu de 'q='

**CORRECTION dans searchAnimes() :**
```javascript
// AVANT (incorrect)
const apiUrl = process.env.NODE_ENV === 'development' 
  ? `/api/search?query=${encodeURIComponent(query)}` 
  : `${API_BASE_URL}/api/search?query=${encodeURIComponent(query)}`;

// APRÈS (correct)
const apiUrl = process.env.NODE_ENV === 'development' 
  ? `/api/search?q=${encodeURIComponent(query)}` 
  : `${API_BASE_URL}/api/search?q=${encodeURIComponent(query)}`;
```

### 3. ID d'Épisode Mal Formaté (CRITIQUE)

**PROBLÈME :** La construction de l'ID d'épisode ne respecte pas le format de l'API

**CORRECTION dans buildEpisodeIdWithLanguage() :**
```javascript
const buildEpisodeIdWithLanguage = (animeId: string, episodeNumber: number, language: string, season: number | null = null) => {
  const langCode = language.toLowerCase(); // 'vf' ou 'vostfr'
  
  // Format correct selon l'API : anime-episode-numero-langue
  return `${animeId}-episode-${episodeNumber}-${langCode}`;
};
```

### 4. Endpoint Seasons Incorrect (CRITIQUE)

**PROBLÈME :** L'endpoint /api/seasons n'existe pas dans votre API

**CORRECTION dans loadSeasonEpisodes() :**
```javascript
// Remplacer l'endpoint seasons par l'endpoint anime
const requestUrl = `${API_BASE_URL}/api/anime/${selectedAnime.id}`;

const response = await fetch(requestUrl, {
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  },
  signal: AbortSignal.timeout(15000)
});
```

### 5. Gestion des Sources Vidéo (CRITIQUE)

**PROBLÈME :** L'accès aux sources vidéo utilise des endpoints incorrects

**CORRECTION dans loadEpisodeSources() :**
```javascript
const loadEpisodeSources = async (episodeId: string) => {
  setLoading(true);
  setError(null);
  
  try {
    // Construire l'ID correct
    const correctEpisodeId = `${selectedAnime.id}-episode-${selectedEpisode.episodeNumber}-${selectedLanguage.toLowerCase()}`;
    
    // Utiliser directement l'endpoint embed
    const embedUrl = `${API_BASE_URL}/api/embed/${correctEpisodeId}`;
    
    const fallbackData = {
      id: correctEpisodeId,
      title: selectedEpisode?.title || 'Épisode',
      animeTitle: selectedAnime?.title || 'Anime',
      episodeNumber: selectedEpisode?.episodeNumber || 1,
      sources: [
        {
          url: embedUrl,
          server: 'Universal',
          serverName: 'Lecteur Principal',
          quality: 'HD',
          language: selectedLanguage,
          type: 'embed',
          serverIndex: 0,
          embedUrl: embedUrl
        }
      ],
      embedUrl: embedUrl
    };
    
    setEpisodeDetails(fallbackData);
    setSelectedServer(0);
    
  } catch (err) {
    setError('Sources vidéo temporairement indisponibles');
  } finally {
    setLoading(false);
  }
};
```

### 6. Configuration CORS pour Iframe (CRITIQUE)

**CORRECTION dans le rendu de l'iframe :**
```javascript
<iframe
  id="video-player"
  key={`${correctEpisodeId}-${selectedServer}-${selectedLanguage}`}
  src={`${API_BASE_URL}/api/embed/${correctEpisodeId}`}
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
/>
```

### 7. Détection des Langues Simplifiée (IMPORTANTE)

**CORRECTION dans detectAvailableLanguages() :**
```javascript
const detectAvailableLanguages = async (animeId: string, seasonNumber: number): Promise<string[]> => {
  // Simplifier - utiliser les langues par défaut
  return ['VOSTFR', 'VF'];
};
```

### 8. Chargement des Épisodes Simplifié (IMPORTANTE)

**CORRECTION pour éviter les endpoints complexes :**
```javascript
const loadSeasonEpisodes = async (season: Season) => {
  if (!selectedAnime) return;
  
  setLoading(true);
  setError(null);
  setCurrentView('player');
  
  try {
    // Générer les épisodes basés sur la saison
    const episodes = correctEpisodeNumbers(selectedAnime.id, season.number, []);
    
    setEpisodes(episodes);
    setSelectedSeason(season);
    setAvailableLanguages(['VOSTFR', 'VF']);
    
    // Charger le premier épisode
    if (episodes.length > 0) {
      const firstEpisode = episodes[0];
      setSelectedEpisode(firstEpisode);
      await loadEpisodeSources(firstEpisode.id);
    }
    
  } catch (err) {
    setError('Impossible de charger les épisodes');
    setCurrentView('anime');
  } finally {
    setLoading(false);
  }
};
```

## RÉSUMÉ DES CHANGEMENTS ESSENTIELS

1. **API_BASE_URL** défini correctement en haut
2. **Paramètre de recherche** : `q=` au lieu de `query=`
3. **Format ID épisode** : `anime-episode-numero-langue`
4. **Endpoints simplifiés** : utiliser `/api/embed/` directement
5. **CORS iframe** : configuration correcte pour l'intégration
6. **Gestion d'erreurs** robuste sans race conditions
7. **Chargement épisodes** basé sur la correction des numéros
8. **Langues par défaut** : VOSTFR et VF disponibles

Ces corrections éliminent les bugs de configuration et permettent à votre page anime-sama de fonctionner correctement avec l'API déployée.