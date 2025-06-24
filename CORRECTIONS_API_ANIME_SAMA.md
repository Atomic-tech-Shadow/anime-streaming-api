# CORRECTIONS API ANIME-SAMA - Configuration Endpoints

## Problèmes Identifiés dans le Code

### 1. API_BASE_URL - Configuration Incorrecte
**PROBLÈME**: URL hardcodée qui ne fonctionne pas avec votre déploiement Render
```javascript
// ❌ INCORRECT - dans votre code actuel
const API_BASE_URL = 'https://api-anime-sama.onrender.com';
```

**SOLUTION**: Utilisez l'URL de votre API Replit locale
```javascript
// ✅ CORRECT - Configuration pour Replit
const API_BASE_URL = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:5000'  
  : 'https://your-repl-name.your-username.repl.co';
```

### 2. Endpoints API - Paramètres Incorrects
**PROBLÈME**: Paramètre de recherche incorrect
```javascript
// ❌ INCORRECT - dans votre code ligne 662
const apiUrl = process.env.NODE_ENV === 'development' 
  ? `/api/search?query=${encodeURIComponent(query)}` 
  : `${API_BASE_URL}/api/search?query=${encodeURIComponent(query)}`;
```

**SOLUTION**: Utiliser 'q' au lieu de 'query'
```javascript
// ✅ CORRECT - Configuration endpoints
const apiUrl = process.env.NODE_ENV === 'development' 
  ? `/api/search?q=${encodeURIComponent(query)}` 
  : `${API_BASE_URL}/api/search?q=${encodeURIComponent(query)}`;
```

### 3. Configuration Client API - Headers Manquants
**PROBLÈME**: Headers CORS insuffisants
```javascript
// ❌ INCORRECT - Headers basiques uniquement
headers: {
  'Accept': 'application/json',
  'Content-Type': 'application/json'
}
```

**SOLUTION**: Headers CORS complets
```javascript
// ✅ CORRECT - Headers optimisés
headers: {
  'Accept': 'application/json',
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache'
}
```

### 4. Construction ID Épisode - Format Incorrect
**PROBLÈME**: Format d'ID inconsistant
```javascript
// ❌ INCORRECT - ligne 1115
correctEpisodeId = `${selectedAnime.id}-episode-${selectedEpisode.episodeNumber}-${lang}`;
```

**SOLUTION**: Format standardisé selon votre API
```javascript
// ✅ CORRECT - Format ID standardisé
const buildEpisodeId = (animeId, episodeNumber, language) => {
  return `${animeId}-episode-${episodeNumber}-${language.toLowerCase()}`;
};
```

### 5. Endpoint Embed - URL Incorrecte
**PROBLÈME**: Endpoint embed mal configuré
```javascript
// ❌ INCORRECT - ligne 1850
const embedUrl = process.env.NODE_ENV === 'development' 
  ? `/api/embed/${correctEpisodeId}`
  : `${API_BASE_URL}/api/embed/${correctEpisodeId}`;
```

**SOLUTION**: Configuration embed correcte
```javascript
// ✅ CORRECT - Endpoint embed optimisé
const embedUrl = `${API_BASE_URL}/api/embed/${correctEpisodeId}`;
```

## FICHIER DE CONFIGURATION COMPLET

Créez un fichier `api-config.js` avec cette configuration:

```javascript
// api-config.js - Configuration API Anime-Sama pour Replit
export const API_CONFIG = {
  // URL de base - à adapter selon votre Repl
  BASE_URL: process.env.NODE_ENV === 'development' 
    ? 'http://localhost:5000'
    : 'https://votre-repl-name.votre-username.repl.co',
  
  // Endpoints corrects
  ENDPOINTS: {
    SEARCH: '/api/search?q=',           // ✅ 'q' pas 'query'
    ANIME: '/api/anime/',
    SEASONS: '/api/seasons',
    EPISODE: '/api/episode/',
    EMBED: '/api/embed/',
    TRENDING: '/api/trending',
    CONTENT: '/api/content',
    CATALOGUE: '/api/catalogue'
  },
  
  // Headers optimisés
  HEADERS: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache'
  },
  
  // Configuration timeout
  TIMEOUT: 15000,
  
  // Utilitaires
  buildEpisodeId: (animeId, episodeNumber, language) => {
    return `${animeId}-episode-${episodeNumber}-${language.toLowerCase()}`;
  },
  
  buildSearchUrl: (query) => {
    return `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.SEARCH}${encodeURIComponent(query)}`;
  },
  
  buildEmbedUrl: (episodeId) => {
    return `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.EMBED}${episodeId}`;
  }
};
```

## CORRECTIONS À APPLIQUER DANS VOTRE COMPOSANT

### Correction 1: Import et initialisation
```javascript
// En haut du fichier
import { API_CONFIG } from './api-config.js';

// Remplacer la ligne 434
const API_BASE_URL = API_CONFIG.BASE_URL;
```

### Correction 2: Fonction de recherche
```javascript
// Remplacer la fonction searchAnimes (ligne 650)
const searchAnimes = async (query) => {
  if (query.trim().length < 2) {
    setSearchResults([]);
    return;
  }

  setLoading(true);
  setError(null);
  
  try {
    const response = await fetch(API_CONFIG.buildSearchUrl(query), {
      headers: API_CONFIG.HEADERS,
      signal: AbortSignal.timeout(API_CONFIG.TIMEOUT)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const apiResponse = await response.json();
    
    if (!apiResponse.success) {
      throw new Error('Erreur lors de la recherche');
    }
    
    setSearchResults(apiResponse.data);
  } catch (err) {
    setError('Impossible de rechercher les animes');
    setSearchResults([]);
  } finally {
    setLoading(false);
  }
};
```

### Correction 3: Chargement détails anime
```javascript
// Remplacer loadAnimeDetails (ligne 695)
const loadAnimeDetails = async (animeId) => {
  setLoading(true);
  setError(null);
  
  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ANIME}${animeId}`, {
      headers: API_CONFIG.HEADERS,
      signal: AbortSignal.timeout(API_CONFIG.TIMEOUT)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const apiResponse = await response.json();
    
    if (!apiResponse.success || !apiResponse.data) {
      throw new Error('Données anime non disponibles');
    }
    
    setSelectedAnime(apiResponse.data);
    setCurrentView('anime');
    setSelectedSeason(null);
    setEpisodes([]);
  } catch (err) {
    setError('Impossible de charger les détails de l\'anime');
  } finally {
    setLoading(false);
  }
};
```

### Correction 4: Sources épisodes
```javascript
// Remplacer loadEpisodeSources (ligne 1107)
const loadEpisodeSources = async (episodeId) => {
  setLoading(true);
  setError(null);
  
  try {
    let correctEpisodeId = episodeId;
    if (selectedAnime && selectedEpisode) {
      correctEpisodeId = API_CONFIG.buildEpisodeId(
        selectedAnime.id, 
        selectedEpisode.episodeNumber, 
        selectedLanguage
      );
    }
    
    const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.EPISODE}${correctEpisodeId}`, {
      headers: API_CONFIG.HEADERS,
      signal: AbortSignal.timeout(API_CONFIG.TIMEOUT)
    });
    
    if (response && response.ok) {
      const apiResponse = await response.json();
      
      if (apiResponse && apiResponse.success && apiResponse.data) {
        const optimizedData = {
          ...apiResponse.data,
          sources: (apiResponse.data.sources || []).map((source, index) => ({
            ...source,
            serverName: `Serveur ${index + 1} - ${source.server}${source.quality ? ` (${source.quality})` : ''}`,
            embedUrl: API_CONFIG.buildEmbedUrl(correctEpisodeId),
            isEmbed: true,
            priority: index === 0 ? 'high' : 'normal'
          }))
        };
        
        setEpisodeDetails(optimizedData);
        setSelectedServer(0);
        return;
      }
    }
    
    // Fallback embed
    const fallbackData = {
      id: correctEpisodeId,
      title: selectedEpisode?.title || 'Épisode',
      animeTitle: selectedAnime?.title || 'Anime',
      episodeNumber: selectedEpisode?.episodeNumber || 1,
      sources: [{
        url: API_CONFIG.buildEmbedUrl(correctEpisodeId),
        server: 'Universal',
        serverName: 'Lecteur Universel',
        quality: 'HD',
        language: selectedLanguage,
        type: 'embed',
        serverIndex: 0,
        isEmbed: true,
        embedUrl: API_CONFIG.buildEmbedUrl(correctEpisodeId)
      }],
      embedUrl: API_CONFIG.buildEmbedUrl(correctEpisodeId)
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

### Correction 5: URL Embed dans le lecteur
```javascript
// Dans le lecteur vidéo (ligne 1849), remplacer:
const embedUrl = API_CONFIG.buildEmbedUrl(correctEpisodeId);
```

## RÉSUMÉ DES CORRECTIONS

1. **API_BASE_URL**: Utilisez votre URL Replit au lieu de onrender.com
2. **Paramètre recherche**: 'q' au lieu de 'query'
3. **Headers CORS**: Configuration complète
4. **Format ID épisode**: Standardisé avec fonction utilitaire
5. **Endpoints embed**: URL correcte et cohérente

Ces corrections résoudront les problèmes de configuration API de votre page anime-sama et permettront une communication correcte avec votre API Replit.