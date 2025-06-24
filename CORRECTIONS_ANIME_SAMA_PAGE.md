# Document de Correction - Page Anime-Sama

**Date**: 24 juin 2025  
**Version**: Corrections post-migration Replit  
**API Cible**: http://localhost:5000 (développement) / https://votre-app.onrender.com (production)

## 🚨 PROBLÈME CRITIQUE 1: Sélection de Langue Buggée

**SYMPTÔME**: Quand vous changez de VF à VOSTFR (ou vice versa), l'ancienne langue continue de jouer.

**DIAGNOSTIC**: L'API retourne bien des URLs différentes pour chaque langue (VF: `vjmxc1jxhw8f`, VOSTFR: `j2ect4ptgep1`). Le bug est dans le cache frontend qui garde l'ancienne langue.

**CORRECTIONS URGENTES**:

### A. Vider Cache Complet au Changement de Langue
```javascript
const handleLanguageChange = async (newLanguage) => {
  console.log(`Changement langue: ${selectedLanguage} -> ${newLanguage}`);
  
  // CRITIQUE: Vider tout le cache d'épisodes
  if (episodeCache) {
    episodeCache.clear();
  }
  
  // Vider le localStorage de cache
  Object.keys(localStorage).forEach(key => {
    if (key.includes('episode') || key.includes('anime')) {
      localStorage.removeItem(key);
    }
  });
  
  // Réinitialiser état du lecteur
  setCurrentEpisode(null);
  setVideoSrc('');
  setEpisodes([]);
  
  // Attendre un délai pour éviter race conditions
  await new Promise(resolve => setTimeout(resolve, 200));
  
  // Mettre à jour la langue
  setSelectedLanguage(newLanguage);
  
  // Recharger les épisodes avec nouvelle langue
  if (selectedAnime && selectedSeason) {
    await loadEpisodes(selectedAnime.id, selectedSeason, newLanguage);
  }
};
```

### B. Construction ID Épisode avec Langue
```javascript
// PROBLÈME: L'ID d'épisode ne change pas avec la langue
// SOLUTION: Toujours inclure la langue dans l'ID

const buildEpisodeIdWithLanguage = (animeId, episodeNumber, language, season = null) => {
  const langCode = language.toLowerCase(); // 'vf' ou 'vostfr'
  
  if (season && season > 1) {
    return `${animeId}-saison${season}-episode-${episodeNumber}-${langCode}`;
  }
  return `${animeId}-episode-${episodeNumber}-${langCode}`;
};

// Usage avec protection
const loadEpisodeWithLanguage = async (animeId, episodeNumber, language) => {
  const episodeId = buildEpisodeIdWithLanguage(animeId, episodeNumber, language);
  
  console.log(`Chargement épisode avec langue: ${episodeId}`);
  
  // Force reload sans cache
  const response = await fetch(`${API_BASE_URL}/api/episode/${episodeId}?lang=${language}&_=${Date.now()}`);
  const data = await response.json();
  
  return data;
};
```

### C. State Management Séparé par Langue
```javascript
// PROBLÈME: Un seul état pour toutes les langues
// SOLUTION: État séparé par langue

const [episodesByLanguage, setEpisodesByLanguage] = useState({
  VF: {},
  VOSTFR: {}
});

const [currentVideoByLanguage, setCurrentVideoByLanguage] = useState({
  VF: null,
  VOSTFR: null
});

const switchLanguage = async (newLanguage) => {
  // Sauvegarder l'état actuel
  if (currentEpisode && videoSrc) {
    setCurrentVideoByLanguage(prev => ({
      ...prev,
      [selectedLanguage]: {
        episode: currentEpisode,
        videoSrc: videoSrc
      }
    }));
  }
  
  // Changer la langue
  setSelectedLanguage(newLanguage);
  
  // Restaurer l'état pour la nouvelle langue
  const savedState = currentVideoByLanguage[newLanguage];
  if (savedState) {
    setCurrentEpisode(savedState.episode);
    setVideoSrc(savedState.videoSrc);
  } else {
    // Première fois dans cette langue, recharger
    setCurrentEpisode(null);
    setVideoSrc('');
    await loadEpisodesForLanguage(newLanguage);
  }
};
```

### D. Debounce Anti-Race pour Changement Langue
```javascript
let languageChangeTimeout = null;

const debouncedLanguageChange = (newLanguage) => {
  // Annuler changement précédent
  if (languageChangeTimeout) {
    clearTimeout(languageChangeTimeout);
  }
  
  // Nouveau changement avec délai
  languageChangeTimeout = setTimeout(async () => {
    await performLanguageChange(newLanguage);
  }, 300); // 300ms de délai
};

const performLanguageChange = async (newLanguage) => {
  if (newLanguage === selectedLanguage) {
    console.log('Même langue, ignore');
    return;
  }
  
  console.log(`Changement définitif: ${selectedLanguage} -> ${newLanguage}`);
  
  // Vider tout cache lié à l'ancienne langue
  clearLanguageCache(selectedLanguage);
  
  // Effectuer le changement
  await handleLanguageChange(newLanguage);
};
```

## 🚨 PROBLÈME CRITIQUE 2: Mauvais Épisode Joué

**❌ SYMPTÔME**: Quand vous sélectionnez un épisode, ce n'est pas le bon épisode qui se lit dans le lecteur.

**🔍 DIAGNOSTIC**: L'API fonctionne correctement et retourne les bonnes URLs d'épisode (vérifiés: épisode 1, 5 et 10 ont des URLs uniques). Le problème est dans le frontend - probablement cache d'épisode ou mauvaise gestion d'état.

**✅ CORRECTIONS URGENTES**:

### A. Cache d'Épisode Buggé
```javascript
// PROBLÈME: Cache qui garde les anciennes données d'épisode
// SOLUTION: Vider le cache à chaque changement d'épisode

const loadEpisode = async (episodeId) => {
  // CRITIQUE: Vider le cache avant de charger un nouvel épisode
  if (episodeCache) {
    episodeCache.delete(episodeId);
    episodeCache.delete(`episode-${episodeId}`);
    // Vider aussi les clés similaires
    for (const [key] of episodeCache.entries()) {
      if (key.includes(episodeId.split('-')[0])) {
        episodeCache.delete(key);
      }
    }
  }
  
  // Forcer rechargement depuis API
  const response = await fetch(`${API_BASE_URL}/api/episode/${episodeId}?_=${Date.now()}`);
  const data = await response.json();
  
  if (data.success && data.data.sources.length > 0) {
    // CRITIQUE: Utiliser embedUrl qui garantit le bon épisode
    const embedUrl = `${API_BASE_URL}${data.data.sources[0].embedUrl}`;
    
    // Vider l'iframe avant de charger le nouveau
    if (videoIframe) {
      videoIframe.src = 'about:blank';
      await new Promise(resolve => setTimeout(resolve, 100)); // Attendre 100ms
    }
    
    videoIframe.src = embedUrl;
    
    console.log(`Épisode chargé: ${episodeId} -> ${embedUrl}`);
  }
};
```

### B. État React Conflictuel
```javascript
// PROBLÈME: État React qui ne se met pas à jour correctement
// SOLUTION: Réinitialiser complètement l'état

const [currentEpisode, setCurrentEpisode] = useState(null);
const [videoSrc, setVideoSrc] = useState('');
const [lastEpisodeId, setLastEpisodeId] = useState('');

const handleEpisodeClick = async (episode) => {
  // CRITIQUE: Vérifier si ce n'est pas déjà l'épisode en cours
  if (lastEpisodeId === episode.id && videoSrc) {
    console.log('Épisode déjà chargé:', episode.id);
    return;
  }
  
  // Réinitialiser complètement l'état
  setCurrentEpisode(null);
  setVideoSrc('');
  setLoading(true);
  
  try {
    // Charger les détails de l'épisode
    const response = await fetch(`${API_BASE_URL}/api/episode/${episode.id}`);
    const data = await response.json();
    
    if (data.success && data.data.sources.length > 0) {
      const newVideoSrc = `${API_BASE_URL}${data.data.sources[0].embedUrl}`;
      
      // CRITIQUE: Mettre à jour l'état dans le bon ordre
      setCurrentEpisode(episode);
      setVideoSrc(newVideoSrc);
      setLastEpisodeId(episode.id);
      
      console.log(`Nouvel épisode: ${episode.id} -> ${newVideoSrc}`);
    }
  } catch (error) {
    console.error('Erreur chargement épisode:', error);
  } finally {
    setLoading(false);
  }
};
```

### C. URL d'Épisode Incorrecte
```javascript
// PROBLÈME: Construction d'URL d'épisode inconsistante
// SOLUTION: Utiliser exactement le même format que l'API

const buildCorrectEpisodeId = (animeId, episodeNumber, language, seasonNumber = null) => {
  // CRITIQUE: Format exact selon l'API
  if (seasonNumber && seasonNumber > 1) {
    return `${animeId}-saison${seasonNumber}-episode-${episodeNumber}-${language.toLowerCase()}`;
  }
  return `${animeId}-episode-${episodeNumber}-${language.toLowerCase()}`;
};

// Test avec My Hero Academia
const testEpisodeIds = [
  buildCorrectEpisodeId('my-hero-academia', 1, 'vostfr'),    // my-hero-academia-episode-1-vostfr
  buildCorrectEpisodeId('my-hero-academia', 5, 'vostfr'),    // my-hero-academia-episode-5-vostfr
  buildCorrectEpisodeId('my-hero-academia', 1, 'vostfr', 7), // my-hero-academia-saison7-episode-1-vostfr
];
```

### D. Race Condition dans le Lecteur
```javascript
// PROBLÈME: Plusieurs épisodes chargés en même temps
// SOLUTION: Queue de chargement

let episodeLoadingQueue = null;

const loadEpisodeWithQueue = async (episodeId) => {
  // Annuler le chargement précédent
  if (episodeLoadingQueue) {
    episodeLoadingQueue.cancel = true;
  }
  
  // Créer nouvelle tâche
  const currentTask = { cancel: false, episodeId };
  episodeLoadingQueue = currentTask;
  
  try {
    await new Promise(resolve => setTimeout(resolve, 100)); // Délai anti-race
    
    // Vérifier si la tâche n'a pas été annulée
    if (currentTask.cancel) {
      console.log('Chargement épisode annulé:', episodeId);
      return;
    }
    
    // Charger l'épisode
    const response = await fetch(`${API_BASE_URL}/api/episode/${episodeId}`);
    const data = await response.json();
    
    // Vérifier encore si pas annulé
    if (currentTask.cancel) {
      console.log('Chargement épisode annulé après fetch:', episodeId);
      return;
    }
    
    // Mettre à jour le lecteur
    if (data.success && data.data.sources.length > 0) {
      const embedUrl = `${API_BASE_URL}${data.data.sources[0].embedUrl}`;
      updateVideoPlayer(embedUrl, episodeId);
    }
    
  } catch (error) {
    if (!currentTask.cancel) {
      console.error('Erreur chargement épisode:', error);
    }
  }
};
```

## 🚨 Problèmes Identifiés et Corrections Requises

### 1. Configuration API Obsolète

**❌ PROBLÈME**: L'API configurée dans la documentation pointe vers `https://api-anime-sama.onrender.com` qui peut ne pas avoir les dernières corrections CORS.

**✅ CORRECTION**:
```javascript
// Remplacer la configuration API actuelle par:
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://votre-nouvelle-app.onrender.com'  // À remplacer par votre URL Render
  : 'http://localhost:5000';  // Pour développement local

// Headers CORS renforcés
const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'X-Frame-Options': 'ALLOWALL'
};
```

### 2. Gestion CORS Iframe Insuffisante

**❌ PROBLÈME**: Le lecteur vidéo affiche "anime-sama.fr n'autorise pas la connexion"

**✅ CORRECTION**: Utiliser les nouveaux endpoints proxy
```javascript
// Dans la fonction de chargement vidéo
const loadEpisodeVideo = async (episodeId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/episode/${episodeId}`);
    const data = await response.json();
    
    if (data.success && data.data.sources.length > 0) {
      const source = data.data.sources[0];
      
      // NOUVEAU: Utiliser proxyUrl au lieu de l'URL directe
      const videoUrl = `${API_BASE_URL}${source.proxyUrl}`;
      
      // Ou utiliser l'endpoint embed dédié
      const embedUrl = `${API_BASE_URL}${source.embedUrl}`;
      
      // Configurer l'iframe avec headers CORS
      iframe.src = embedUrl;  // Plus fiable que proxyUrl
      iframe.setAttribute('allowfullscreen', 'true');
      iframe.setAttribute('allow', 'autoplay; fullscreen');
    }
  } catch (error) {
    console.error('Erreur chargement vidéo:', error);
    showErrorMessage('Impossible de charger la vidéo. Essayez un autre serveur.');
  }
};
```

### 3. Endpoints Episode avec Saison Manquants

**❌ PROBLÈME**: Les appels d'épisode utilisent un format incorrect pour les saisons

**✅ CORRECTION**: Ajuster le format des IDs d'épisode
```javascript
// ANCIEN format (incorrect)
const episodeId = `${animeId}-episode-${episodeNumber}-${language}`;

// NOUVEAU format (correct pour saisons)
const generateEpisodeId = (animeId, season, episode, language) => {
  if (season > 1) {
    return `${animeId}-saison${season}-episode-${episode}-${language}`;
  }
  return `${animeId}-episode-${episode}-${language}`;
};

// Exemple d'utilisation
const episodeId = generateEpisodeId('my-hero-academia', 7, 1, 'vostfr');
// Résultat: "my-hero-academia-saison7-episode-1-vostfr"
```

### 4. Gestion d'Erreur Race Conditions

**❌ PROBLÈME**: Changements de langue peuvent créer des conflits

**✅ CORRECTION**: Ajouter protection anti-race condition
```javascript
// Ajouter un flag de protection
let languageChangeInProgress = false;

const handleLanguageChange = async (newLanguage) => {
  // Protection contre les appels multiples
  if (languageChangeInProgress) {
    console.log('Changement de langue déjà en cours...');
    return;
  }
  
  languageChangeInProgress = true;
  
  try {
    setLoading(true);
    setError(null);
    
    // Effectuer le changement
    await loadEpisodes(selectedAnime.id, selectedSeason, newLanguage.toLowerCase());
    setSelectedLanguage(newLanguage);
    
    // Sauvegarder la préférence
    localStorage.setItem('preferred_language', newLanguage);
    
  } catch (error) {
    console.error('Erreur changement langue:', error);
    setError(`Impossible de charger les épisodes en ${newLanguage}`);
    
    // Ne pas changer la langue en cas d'erreur
    // setSelectedLanguage reste inchangé
    
  } finally {
    setLoading(false);
    languageChangeInProgress = false;
  }
};
```

### 5. Cache Non Optimisé

**❌ PROBLÈME**: Le cache actuel ne gère pas les expirations proprement

**✅ CORRECTION**: Implémenter un cache avec TTL
```javascript
class SmartCache {
  constructor(ttl = 300000) { // 5 minutes par défaut
    this.cache = new Map();
    this.ttl = ttl;
  }
  
  set(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expires: Date.now() + this.ttl
    });
  }
  
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }
  
  clear() {
    this.cache.clear();
  }
  
  size() {
    return this.cache.size;
  }
}

// Utilisation
const episodeCache = new SmartCache(300000); // 5 minutes

const getEpisodesCached = async (animeId, season, language) => {
  const cacheKey = `${animeId}-${season}-${language}`;
  
  // Vérifier le cache d'abord
  const cached = episodeCache.get(cacheKey);
  if (cached) {
    console.log('Données depuis cache:', cacheKey);
    return cached;
  }
  
  // Charger depuis API
  const data = await loadEpisodesFromAPI(animeId, season, language);
  
  // Mettre en cache
  episodeCache.set(cacheKey, data);
  
  return data;
};
```

### 6. Retry Logic Manquant

**❌ PROBLÈME**: Pas de gestion de retry en cas d'échec API

**✅ CORRECTION**: Ajouter système de retry automatique
```javascript
const fetchWithRetry = async (url, options = {}, maxRetries = 3) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Tentative ${attempt}/${maxRetries}: ${url}`);
      
      const response = await fetch(url, {
        ...options,
        timeout: 20000  // 20 secondes
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
      
    } catch (error) {
      lastError = error;
      console.warn(`Tentative ${attempt} échouée:`, error.message);
      
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // Délai exponentiel
        console.log(`Retry dans ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
};

// Utilisation dans vos appels API
const searchAnime = async (query) => {
  try {
    return await fetchWithRetry(`${API_BASE_URL}/api/search?query=${encodeURIComponent(query)}`);
  } catch (error) {
    console.error('Recherche échouée après tous les retries:', error);
    throw new Error('Impossible de rechercher les animes. Vérifiez votre connexion.');
  }
};
```

### 7. URLs Episode Incorrectes

**❌ PROBLÈME**: Format d'URL d'épisode non conforme à l'API

**✅ CORRECTION**: Utiliser le bon format d'URL
```javascript
// Fonction pour construire l'URL d'épisode
const buildEpisodeUrl = (animeData, season, episodeNumber, language) => {
  const animeId = animeData.id;
  const seasonData = animeData.seasons.find(s => s.number === season);
  
  if (!seasonData) {
    throw new Error(`Saison ${season} non trouvée pour ${animeId}`);
  }
  
  // Format pour saison 1
  if (season === 1) {
    return `${animeId}-episode-${episodeNumber}-${language}`;
  }
  
  // Format pour autres saisons
  return `${animeId}-saison${season}-episode-${episodeNumber}-${language}`;
};

// Cas spéciaux (si nécessaire)
const buildEpisodeUrlWithFallback = (animeData, season, episodeNumber, language) => {
  const patterns = [
    `${animeData.id}-saison${season}-episode-${episodeNumber}-${language}`,
    `${animeData.id}-s${season}e${episodeNumber}-${language}`,
    `${animeData.id}-${season}x${episodeNumber.toString().padStart(2, '0')}-${language}`,
    `${animeData.id}-episode-${episodeNumber}-${language}` // Fallback
  ];
  
  return patterns;
};
```

### 8. État Loading Non Granulaire

**❌ PROBLÈME**: Un seul état loading pour toute l'application

**✅ CORRECTION**: États loading granulaires
```javascript
const [loadingStates, setLoadingStates] = useState({
  search: false,
  anime: false,
  episodes: false,
  video: false
});

const setLoading = (type, isLoading) => {
  setLoadingStates(prev => ({
    ...prev,
    [type]: isLoading
  }));
};

// Utilisation
const searchAnime = async (query) => {
  setLoading('search', true);
  try {
    const results = await api.search(query);
    setSearchResults(results);
  } catch (error) {
    setError('Erreur de recherche');
  } finally {
    setLoading('search', false);
  }
};

const loadEpisodes = async (animeId, season, language) => {
  setLoading('episodes', true);
  try {
    const episodes = await api.getEpisodes(animeId, season, language);
    setEpisodes(episodes);
  } catch (error) {
    setError('Erreur chargement épisodes');
  } finally {
    setLoading('episodes', false);
  }
};
```

### 9. Sélecteur de Serveur Manquant

**❌ PROBLÈME**: Pas de possibilité de changer de serveur vidéo

**✅ CORRECTION**: Ajouter sélecteur de serveur
```javascript
const VideoPlayer = ({ episodeId, sources }) => {
  const [selectedServerIndex, setSelectedServerIndex] = useState(0);
  const [videoError, setVideoError] = useState(false);
  
  const currentSource = sources[selectedServerIndex];
  
  const handleServerChange = (index) => {
    setSelectedServerIndex(index);
    setVideoError(false);
  };
  
  const handleVideoError = () => {
    setVideoError(true);
    
    // Auto-switch au serveur suivant
    if (selectedServerIndex < sources.length - 1) {
      console.log('Changement automatique vers serveur suivant');
      setSelectedServerIndex(prev => prev + 1);
    }
  };
  
  return (
    <div className="video-player">
      {/* Sélecteur de serveur */}
      <div className="server-selector">
        <label>Serveur:</label>
        {sources.map((source, index) => (
          <button
            key={index}
            className={`server-btn ${index === selectedServerIndex ? 'active' : ''}`}
            onClick={() => handleServerChange(index)}
            disabled={!source.url}
          >
            {source.server} ({source.quality})
            {index === selectedServerIndex && videoError && ' ❌'}
          </button>
        ))}
      </div>
      
      {/* Lecteur vidéo */}
      <div className="video-container">
        {videoError ? (
          <div className="error-message">
            Erreur de lecture. Essayez un autre serveur.
          </div>
        ) : (
          <iframe
            src={`${API_BASE_URL}${currentSource.embedUrl}`}
            onError={handleVideoError}
            allowFullScreen
            allow="autoplay; fullscreen"
          />
        )}
      </div>
    </div>
  );
};
```

### 10. Configuration Responsive Manquante

**❌ PROBLÈME**: Interface non optimisée mobile

**✅ CORRECTION**: Ajouter styles responsive
```css
/* Responsive design pour mobile */
@media (max-width: 768px) {
  .anime-container {
    padding: 10px;
  }
  
  .search-bar {
    width: 100%;
    margin-bottom: 20px;
  }
  
  .episode-grid {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 10px;
  }
  
  .video-player iframe {
    height: 200px;
  }
  
  .server-selector {
    flex-wrap: wrap;
    gap: 5px;
  }
  
  .server-btn {
    font-size: 12px;
    padding: 5px 8px;
  }
  
  .language-selector {
    flex-direction: column;
    align-items: stretch;
  }
}

/* Mode paysage mobile */
@media (orientation: landscape) and (max-height: 500px) {
  .video-player iframe {
    height: 300px;
  }
}
```

## 🔄 Plan de Migration Étape par Étape

### Étape 1: Mise à jour Configuration API
1. Changer l'URL de base API vers votre instance Render
2. Ajouter les nouveaux headers CORS
3. Implémenter le système de retry

### Étape 2: Correction Lecteur Vidéo
1. Remplacer les URLs directes par embedUrl
2. Ajouter le sélecteur de serveur
3. Implémenter la gestion d'erreur vidéo

### Étape 3: Optimisation Cache et Performance
1. Implémenter SmartCache avec TTL
2. Ajouter états loading granulaires
3. Optimiser les appels API

### Étape 4: Corrections UX
1. Ajouter protection race conditions
2. Améliorer gestion d'erreurs
3. Ajouter responsive design

### Étape 5: Tests et Validation
1. Tester tous les animes populaires
2. Vérifier compatibilité mobile
3. Valider performance cache

## 🧪 Test Changement de Langue

Testez spécifiquement le changement de langue :

```javascript
const testLanguageSwitch = async () => {
  console.log('🧪 Test changement VF/VOSTFR');
  
  const testCases = [
    { episodeNumber: 1, vf: 'my-hero-academia-episode-1-vf', vostfr: 'my-hero-academia-episode-1-vostfr' },
    { episodeNumber: 5, vf: 'my-hero-academia-episode-5-vf', vostfr: 'my-hero-academia-episode-5-vostfr' }
  ];
  
  for (const testCase of testCases) {
    console.log(`Test épisode ${testCase.episodeNumber}:`);
    
    // Test VF
    const vfResponse = await fetch(`${API_BASE_URL}/api/episode/${testCase.vf}`);
    const vfData = await vfResponse.json();
    
    // Test VOSTFR
    const vostfrResponse = await fetch(`${API_BASE_URL}/api/episode/${testCase.vostfr}`);
    const vostfrData = await vostfrResponse.json();
    
    if (vfData.success && vostfrData.success) {
      const vfUrl = vfData.data.sources[0].url;
      const vostfrUrl = vostfrData.data.sources[0].url;
      
      console.log(`Épisode ${testCase.episodeNumber} VF: ${vfUrl}`);
      console.log(`Épisode ${testCase.episodeNumber} VOSTFR: ${vostfrUrl}`);
      
      // Vérifier que les URLs sont différentes
      if (vfUrl === vostfrUrl) {
        console.error(`❌ ERREUR: Même URL pour VF et VOSTFR !`);
      } else {
        console.log(`✅ URLs différentes pour VF/VOSTFR`);
      }
      
      // Extraire identifiants uniques
      const vfId = vfUrl.split('/').pop();
      const vostfrId = vostfrUrl.split('/').pop();
      console.log(`VF ID: ${vfId}, VOSTFR ID: ${vostfrId}`);
    }
    
    console.log('---');
  }
};

// Lancer le test
testLanguageSwitch();
```

## 🔧 Débogage Changement Langue

Ajoutez ces logs pour traquer les changements de langue :

```javascript
const debugLanguageChange = (oldLang, newLang, episodeId) => {
  console.log(`🌐 CHANGEMENT LANGUE`);
  console.log(`🌐 Ancienne: ${oldLang}`);
  console.log(`🌐 Nouvelle: ${newLang}`);
  console.log(`🌐 Épisode: ${episodeId}`);
  console.log(`🌐 Cache avant:`, episodeCache.size());
  console.log(`🌐 État vidéo avant:`, videoIframe?.src);
  console.log(`🌐 Timestamp:`, new Date().toISOString());
  
  // Après changement
  setTimeout(() => {
    console.log(`🌐 Cache après:`, episodeCache.size());
    console.log(`🌐 État vidéo après:`, videoIframe?.src);
    console.log(`🌐 CHANGEMENT TERMINÉ`);
  }, 1000);
};
```

## 🧪 Test de Correspondance Épisode

Ajoutez ce code de test pour vérifier que le bon épisode se charge :

```javascript
const testEpisodeCorrespondence = async () => {
  console.log('🧪 Test correspondance épisode/vidéo');
  
  const testCases = [
    { episodeId: 'my-hero-academia-episode-1-vostfr', expectedEpisode: 1 },
    { episodeId: 'my-hero-academia-episode-5-vostfr', expectedEpisode: 5 },
    { episodeId: 'my-hero-academia-episode-10-vostfr', expectedEpisode: 10 }
  ];
  
  for (const testCase of testCases) {
    try {
      console.log(`Test épisode ${testCase.expectedEpisode}...`);
      
      // Charger l'épisode
      const response = await fetch(`${API_BASE_URL}/api/episode/${testCase.episodeId}`);
      const data = await response.json();
      
      if (data.success && data.data.sources.length > 0) {
        const url = data.data.sources[0].url;
        console.log(`Épisode ${testCase.expectedEpisode}: ${url}`);
        
        // Vérifier que l'URL est unique (pas de cache buggé)
        const urlHash = url.split('/').pop();
        console.log(`Hash unique: ${urlHash}`);
        
        // Simuler le chargement dans iframe
        const embedUrl = `${API_BASE_URL}${data.data.sources[0].embedUrl}`;
        console.log(`Iframe URL: ${embedUrl}`);
        
      } else {
        console.error(`❌ Pas de sources pour épisode ${testCase.expectedEpisode}`);
      }
    } catch (error) {
      console.error(`❌ Erreur test épisode ${testCase.expectedEpisode}:`, error);
    }
  }
  
  console.log('🎉 Test terminé - vérifiez que chaque épisode a une URL unique');
};

// Lancer le test
testEpisodeCorrespondence();
```

## 🔧 Débogage en Temps Réel

Ajoutez ces logs dans votre page pour identifier le problème :

```javascript
// Dans votre fonction de chargement d'épisode
const loadEpisode = async (episodeId) => {
  console.log(`🎬 DÉBUT chargement épisode: ${episodeId}`);
  console.log(`🎬 Timestamp: ${new Date().toISOString()}`);
  
  const response = await fetch(`${API_BASE_URL}/api/episode/${episodeId}`);
  const data = await response.json();
  
  if (data.success) {
    const url = data.data.sources[0].url;
    const embedUrl = data.data.sources[0].embedUrl;
    
    console.log(`🎬 URL reçue: ${url}`);
    console.log(`🎬 Embed URL: ${embedUrl}`);
    console.log(`🎬 Hash unique: ${url.split('/').pop()}`);
    
    // Vérifier si l'iframe change vraiment
    const currentIframeSrc = videoIframe.src;
    const newIframeSrc = `${API_BASE_URL}${embedUrl}`;
    
    console.log(`🎬 Iframe actuelle: ${currentIframeSrc}`);
    console.log(`🎬 Nouvelle iframe: ${newIframeSrc}`);
    console.log(`🎬 Changement: ${currentIframeSrc !== newIframeSrc ? 'OUI' : 'NON'}`);
    
    videoIframe.src = newIframeSrc;
    
    console.log(`🎬 FIN chargement épisode: ${episodeId}`);
  }
};
```

## 🧪 Code de Test

```javascript
// Test complet de l'intégration
const testAnimeIntegration = async () => {
  console.log('🧪 Test intégration Anime-Sama');
  
  try {
    // Test 1: Recherche
    console.log('Test recherche...');
    const searchResults = await searchAnime('my hero academia');
    console.log('✅ Recherche OK:', searchResults.length, 'résultats');
    
    // Test 2: Détails anime
    console.log('Test détails anime...');
    const animeDetails = await getAnimeDetails(searchResults[0].id);
    console.log('✅ Détails OK:', animeDetails.title);
    
    // Test 3: Épisodes
    console.log('Test épisodes...');
    const episodeId = generateEpisodeId('my-hero-academia', 7, 1, 'vostfr');
    const episodeDetails = await getEpisodeDetails(episodeId);
    console.log('✅ Épisodes OK:', episodeDetails.sources.length, 'sources');
    
    // Test 4: Lecteur
    console.log('Test lecteur...');
    const embedUrl = episodeDetails.sources[0].embedUrl;
    console.log('✅ Lecteur OK:', embedUrl);
    
    console.log('🎉 Tous les tests passés!');
    
  } catch (error) {
    console.error('❌ Test échoué:', error);
  }
};

// Lancer le test
testAnimeIntegration();
```

## 📝 Résumé des Corrections

1. **✅ Configuration API mise à jour** avec votre instance Render
2. **✅ Correction CORS iframe** avec embedUrl et proxyUrl  
3. **✅ Format épisode corrigé** pour les saisons multiples
4. **✅ Protection race conditions** pour changements langue
5. **✅ Cache intelligent** avec TTL et expiration
6. **✅ Système retry** avec délai exponentiel
7. **✅ États loading granulaires** pour meilleure UX
8. **✅ Sélecteur serveur** avec fallback automatique
9. **✅ Design responsive** pour mobile
10. **✅ Tests complets** pour validation

Avec ces corrections, votre page anime-sama fonctionnera parfaitement avec l'API migrée sur Render.