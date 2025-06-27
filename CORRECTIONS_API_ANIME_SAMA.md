# Corrections pour l'intégration Frontend avec l'API Anime Sama

## URL de l'API déployée
```
https://api-anime-sama.onrender.com
```

## Erreurs identifiées et corrections

### 1. Configuration API vide (Critique)

**❌ Erreur dans anime-sama.tsx ligne 58:**
```typescript
const API_BASE_URL = '';
```

**✅ Correction:**
```typescript
const API_BASE_URL = 'https://api-anime-sama.onrender.com';
```

### 2. Headers API manquants

**✅ Headers requis:**
```typescript
const API_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'Origin': window.location.origin
};
```

### 3. Gestion d'erreurs insuffisante

**✅ Fonction de requête corrigée avec timeout et retry:**
```typescript
const apiRequest = async (endpoint, options = {}) => {
  const maxRetries = 3;
  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      // Timeout de 30 secondes
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'GET',
        headers: API_HEADERS,
        signal: controller.signal,
        ...options
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      attempt++;
      if (attempt === maxRetries || error.name === 'AbortError') {
        console.error('Erreur API après', maxRetries, 'tentatives:', error);
        throw error;
      }
      // Attendre avant de réessayer
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
};
```

### 4. Endpoints API validés

**✅ Endpoints fonctionnels avec l'API déployée:**

```typescript
// Recherche d'animes
const searchAnimes = async (query) => {
  const response = await apiRequest(`/api/search?query=${encodeURIComponent(query)}`);
  return response;
};

// Détails d'un anime
const getAnimeDetails = async (animeId) => {
  const response = await apiRequest(`/api/anime/${animeId}`);
  return response;
};

// Saisons et épisodes (ENDPOINT VALIDÉ)
const getSeasonEpisodes = async (animeId, seasonNumber, language = 'VOSTFR') => {
  const response = await apiRequest(`/api/seasons?animeId=${animeId}&season=${seasonNumber}&language=${language}`);
  return response;
};

// Sources de streaming d'un épisode
const getEpisodeSources = async (episodeId) => {
  const response = await apiRequest(`/api/episode/${episodeId}`);
  return response;
};

// Catalogue complet
const getCatalogue = async () => {
  const response = await apiRequest('/api/catalogue');
  return response;
};

// Animes populaires
const getTrending = async () => {
  const response = await apiRequest('/api/trending');
  return response;
};
```

### 5. Génération correcte des ID d'épisodes

**✅ Format validé par l'API:**
```typescript
const generateEpisodeId = (animeId, episodeNumber, language) => {
  const languageCode = language.toLowerCase();
  return `${animeId}-${episodeNumber}-${languageCode}`;
};

// Exemple: "one-piece-1-vostfr"
```

### 6. Gestion des erreurs de streaming

**✅ Gestion robuste des sources vidéo:**
```typescript
const handleVideoError = (error, sources, currentPlayerIndex, setPlayerIndex, setError) => {
  console.error('Erreur lecteur vidéo:', error);
  
  // Essayer le serveur suivant
  if (sources.length > currentPlayerIndex + 1) {
    setPlayerIndex(currentPlayerIndex + 1);
  } else {
    setError('Aucune source vidéo fonctionnelle disponible');
  }
};
```

### 7. Configuration d'environnement

**✅ Configuration pour différents environnements:**
```typescript
const getApiBaseUrl = () => {
  // Production déployée
  if (process.env.NODE_ENV === 'production') {
    return 'https://api-anime-sama.onrender.com';
  }
  
  // Développement local
  if (window.location.hostname === 'localhost') {
    return 'http://localhost:5000';
  }
  
  // Par défaut: API déployée
  return 'https://api-anime-sama.onrender.com';
};

const API_BASE_URL = getApiBaseUrl();
```

## Exemple d'implémentation complète

**✅ Configuration finale recommandée:**
```typescript
import React, { useState, useEffect } from 'react';

// Configuration API
const API_BASE_URL = 'https://api-anime-sama.onrender.com';
const API_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};

// Fonction de requête robuste
const apiRequest = async (endpoint, options = {}) => {
  const maxRetries = 3;
  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'GET',
        headers: API_HEADERS,
        signal: controller.signal,
        ...options
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      attempt++;
      if (attempt === maxRetries || error.name === 'AbortError') {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
};

// Utilisation dans le composant
const AnimePage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiRequest('/api/search?query=naruto');
      
      if (response.success && response.data) {
        setData(response.data);
      } else {
        throw new Error('Format de réponse invalide');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Rest of component...
};
```

## Tests de validation

**✅ URLs de test avec l'API déployée:**
```
https://api-anime-sama.onrender.com/api/health
https://api-anime-sama.onrender.com/api/search?query=naruto
https://api-anime-sama.onrender.com/api/anime/one-piece
https://api-anime-sama.onrender.com/api/seasons?animeId=one-piece&season=1&language=VOSTFR
https://api-anime-sama.onrender.com/api/episode/one-piece-1-vostfr
```

## Résumé des corrections

1. **Remplacer `API_BASE_URL = ''`** par l'URL déployée
2. **Ajouter gestion d'erreurs** avec timeout et retry
3. **Utiliser les endpoints validés** (notamment `/api/seasons`)
4. **Implémenter la génération correcte** des ID d'épisodes
5. **Ajouter headers appropriés** pour les requêtes
6. **Gérer les erreurs de streaming** avec fallback automatique

Toutes ces corrections permettront à votre frontend de fonctionner parfaitement avec l'API Anime Sama déployée.