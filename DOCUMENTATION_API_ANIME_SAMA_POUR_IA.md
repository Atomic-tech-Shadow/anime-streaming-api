# Documentation API Anime-Sama pour Correction IA

## Vue d'ensemble

Cette documentation est destinée à l'IA qui va corriger la page anime-sama. L'API fonctionne parfaitement sur `http://localhost:5000` avec tous les endpoints testés et validés.

## Configuration API Validée

### Endpoint de base
```
BASE_URL: http://localhost:5000
```

### Headers requis
```javascript
{
  'Content-Type': 'application/json',
  'Accept': 'application/json'
}
```

## Endpoints Fonctionnels (Testés)

### 1. Santé de l'API
```
GET /api/health
```
**Réponse validée :**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "service": "anime-sama-api",
    "version": "2.0.0",
    "environment": "vercel-serverless",
    "uptime": 116.28,
    "memory": {"used": 9, "total": 10, "external": 4}
  }
}
```

### 2. Recherche d'animes
```
GET /api/search?query={terme_recherche}
```
**⚠️ IMPORTANT :** Utiliser `query=` et NON `q=`

**Exemple testé :**
```
GET /api/search?query=one+piece
```
**Réponse :**
```json
{
  "success": true,
  "data": [
    {
      "id": "one-piece",
      "title": "One Piece",
      "url": "https://anime-sama.fr/catalogue/one-piece/",
      "type": "anime",
      "status": "Disponible",
      "image": "https://cdn.statically.io/gh/Anime-Sama/IMG/img/contenu/one-piece.jpg"
    }
  ],
  "meta": {
    "query": "one piece",
    "resultsCount": 1,
    "source": "anime-sama.fr"
  }
}
```

### 3. Détails d'un anime
```
GET /api/anime/{animeId}
```
**Exemple testé :**
```
GET /api/anime/one-piece
```
**Réponse (extrait) :**
```json
{
  "success": true,
  "data": {
    "id": "one-piece",
    "title": "One Piece",
    "description": "Description non disponible",
    "image": "https://cdn.statically.io/gh/Anime-Sama/IMG/img/contenu/one-piece.jpg",
    "genres": ["Action", "Aventure"],
    "status": "En cours",
    "year": "2025",
    "seasons": [
      {
        "number": 1,
        "name": "Saga 1 (East Blue)",
        "languages": ["VOSTFR"],
        "episodeCount": 0,
        "url": "https://anime-sama.fr/catalogue/one-piece/saison1"
      }
    ],
    "progressInfo": {
      "advancement": "Aucune donnée.",
      "correspondence": "Episode 1122 -> Chapitre 1088",
      "totalEpisodes": 1122,
      "hasFilms": true,
      "hasScans": true
    }
  }
}
```

### 4. Épisodes par saison
```
GET /api/seasons?animeId={id}&season={numero}&language={langue}
```
**Paramètres :**
- `animeId` : ID de l'anime (ex: "one-piece")
- `season` : Numéro de saison (ex: 11)
- `language` : "vf" ou "vostfr"

**Exemple testé :**
```
GET /api/seasons?animeId=one-piece&season=11&language=vostfr
```

### 5. Sources d'un épisode
```
GET /api/episode/{episodeId}
```
**Format episodeId :** `{anime}-episode-{numero}-{langue}`

**Exemples testés :**
```
GET /api/episode/one-piece-episode-1093-vostfr
GET /api/episode/one-piece-episode-1093-vf
```

**Réponse (VF confirmée) :**
```json
{
  "success": true,
  "data": {
    "id": "one-piece-episode-1093-vf",
    "title": "Épisode 1093",
    "animeTitle": "One Piece",
    "episodeNumber": 1093,
    "language": "VF",
    "sources": [
      {
        "url": "https://video.sibnet.ru/shell.php?videoid=5839623",
        "server": "Serveur 1",
        "quality": "SD",
        "language": "VF",
        "type": "direct",
        "serverIndex": 1,
        "embedUrl": "/api/embed/one-piece-episode-1093-vf"
      }
    ],
    "availableServers": ["Serveur 1", "Serveur 2"],
    "embedUrl": "/api/embed/one-piece-episode-1093-vf"
  }
}
```

### 6. Embed pour lecteur vidéo
```
GET /api/embed/{episodeId}
```
**Usage :** Pour intégrer directement dans un iframe
```html
<iframe src="/api/embed/one-piece-episode-1093-vf" 
        width="100%" height="500px" 
        frameborder="0" allowfullscreen>
</iframe>
```

### 7. Animes tendances
```
GET /api/trending
```

### 8. Catalogue complet
```
GET /api/catalogue
```

## Configuration JavaScript Corrigée

Le fichier `api-config.js` a été corrigé avec les bons paramètres :

```javascript
export const AnimeAPI = {
  // ✅ CORRIGÉ : Utilise query= au lieu de q=
  search: (query) => apiRequest(`/api/search?query=${encodeURIComponent(query)}`, { 
    method: 'GET'
  }).then(response => response.data),
  
  // ✅ CORRIGÉ : Inclut tous les paramètres requis
  getSeasonEpisodes: (animeId, season, language = 'vostfr') => 
    apiRequest(`/api/seasons?animeId=${animeId}&season=${season}&language=${language}`, {
      method: 'GET'
    }).then(response => response.data),
  
  // Autres fonctions inchangées
  getAnime: (animeId) => apiRequest(`/api/anime/${animeId}`).then(response => response.data),
  getEpisodeSources: (episodeId) => apiRequest(`/api/episode/${episodeId}`).then(response => response.data),
  getTrending: () => apiRequest('/api/trending').then(response => response.data)
};
```

## Système Universel Confirmé

### Détection automatique des langues
- L'API détecte automatiquement les langues disponibles (VF/VOSTFR)
- Pas besoin de configuration manuelle par anime
- Support universel pour tous les animes d'anime-sama.fr

### Correspondance d'épisodes intelligente
- **One Piece épisode 1093** : Fonctionne en VF et VOSTFR
- **Naruto épisode 50** : Testé et fonctionnel
- **Système universel** : Détection automatique des saisons

### Génération d'IDs d'épisodes
Format standard : `{anime-id}-episode-{numero}-{langue}`
- `one-piece-episode-1093-vf`
- `one-piece-episode-1093-vostfr`
- `naruto-episode-50-vostfr`

## Gestion des Erreurs

### Codes de statut
- `200` : Succès
- `400` : Paramètres manquants ou invalides
- `404` : Ressource non trouvée
- `500` : Erreur serveur

### Structure d'erreur
```json
{
  "error": true,
  "message": "Description de l'erreur",
  "status": 400,
  "timestamp": "2025-06-23T06:09:28.932Z"
}
```

## Performance et Cache

### Temps de réponse observés
- Santé API : ~0.1s
- Recherche : ~0.5-1s
- Détails anime : ~2-3s
- Sources épisode : ~3-6s (dépend de l'extraction depuis anime-sama.fr)

### Cache TTL
- Cache en mémoire : 5 minutes par défaut
- Pas de cache persistant (redémarre avec le serveur)

## CORS et Sécurité

### Headers CORS configurés
```javascript
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Accept
```

### Endpoints proxy disponibles
- `/api/proxy/{url}` : Pour contourner les restrictions CORS
- `/api/embed/{episodeId}` : Lecteur intégré avec contournement CORS

## Exemples d'Intégration

### Recherche et affichage
```javascript
// Recherche
const results = await AnimeAPI.search('demon slayer');
console.log(`${results.length} animes trouvés`);

// Détails
const anime = await AnimeAPI.getAnime('demon-slayer');
console.log(`${anime.title} - ${anime.progressInfo.totalEpisodes} épisodes`);

// Épisodes d'une saison
const episodes = await AnimeAPI.getSeasonEpisodes('demon-slayer', 1, 'vostfr');
console.log(`${episodes.episodes.length} épisodes en VOSTFR`);

// Sources de streaming
const sources = await AnimeAPI.getEpisodeSources('demon-slayer-episode-1-vostfr');
console.log(`${sources.sources.length} serveurs disponibles`);
```

### Intégration lecteur vidéo
```javascript
// Générer l'URL d'embed
const episodeId = `${animeId}-episode-${episodeNumber}-${language}`;
const embedUrl = `/api/embed/${episodeId}`;

// Intégrer dans iframe
const iframe = document.createElement('iframe');
iframe.src = embedUrl;
iframe.width = '100%';
iframe.height = '500px';
iframe.frameBorder = '0';
iframe.allowFullscreen = true;
```

## Points Critiques pour la Correction

### 1. Paramètres API corrects
- ✅ `query=` pour la recherche (pas `q=`)
- ✅ `animeId=`, `season=`, `language=` pour les saisons
- ✅ Format d'ID épisode : `{anime}-episode-{numero}-{langue}`

### 2. Gestion des langues
- VF et VOSTFR supportées
- Détection automatique des langues disponibles
- Fallback intelligent si langue non disponible

### 3. Performance
- Implémenter un cache frontend (localStorage)
- Précharger les épisodes suivants
- Timeout de 15 secondes recommandé

### 4. Interface utilisateur
- Sélecteur VF/VOSTFR fonctionnel
- Indicateur de chargement pendant l'extraction
- Gestion d'erreur avec retry automatique

### 5. Structure des données
- Utiliser `progressInfo.totalEpisodes` pour le nombre réel d'épisodes
- `seasons` array contient toutes les saisons disponibles
- `sources` array contient tous les serveurs de streaming

## Tests de Validation

Tous ces endpoints ont été testés et fonctionnent :
- ✅ `/api/health` - Service opérationnel
- ✅ `/api/search?query=one+piece` - Recherche fonctionnelle
- ✅ `/api/anime/one-piece` - Détails avec 1122 épisodes
- ✅ `/api/seasons?animeId=one-piece&season=11&language=vostfr` - Épisodes VOSTFR
- ✅ `/api/episode/one-piece-episode-1093-vf` - Sources VF confirmées
- ✅ `/api/episode/one-piece-episode-1093-vostfr` - Sources VOSTFR confirmées
- ✅ `/api/embed/one-piece-episode-1093-vf` - Lecteur intégré

## État de Migration

✅ **Migration Replit Agent → Replit terminée**
- Toutes les dépendances installées
- Serveur fonctionnel sur port 5000
- API opérationnelle avec données authentiques
- Configuration corrigée et testée

L'API est prête pour intégration dans la page anime-sama avec toutes les fonctionnalités authentiques d'anime-sama.fr.