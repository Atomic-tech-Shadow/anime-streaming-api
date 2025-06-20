# Guide d'Implémentation CORS - Page Anime-Sama

## 🚨 Problème confirmé

Message d'erreur typique dans le lecteur :
```
Nightly Can't Open This Page
To protect your security, anime-sama.fr will not allow Nightly to display the page if another site has embedded it.
```

## ✅ Solution immédiate disponible

Votre API inclut déjà les solutions. Il suffit de modifier votre code front-end.

## 🔧 Implémentation dans anime-sama.tsx

### Étape 1: Modifier loadEpisodeSources

**Remplacez votre fonction actuelle** :
```typescript
const loadEpisodeSources = async (episodeId: string) => {
  try {
    const response = await fetch(`${API_BASE}/api/episode/${episodeId}`);
    const apiResponse = await response.json();
    
    if (apiResponse.success) {
      // CHANGEMENT ICI : Utiliser proxyUrl au lieu de url
      const sources = apiResponse.data.sources.map(source => ({
        ...source,
        url: source.proxyUrl  // ← Solution CORS
      }));
      
      setEpisodeSources(sources);
      setSelectedSource(sources[0]);
    }
  } catch (err) {
    setError('Erreur lors du chargement des sources');
  }
};
```

### Étape 2: Alternative avec Embed complet

**Option plus simple** - Utilisez directement l'embed :
```typescript
const playEpisodeWithEmbed = (episodeId: string) => {
  const embedUrl = `https://api-anime-sama.onrender.com/api/embed/${episodeId}`;
  setVideoUrl(embedUrl);
  setCurrentView('player');
};
```

### Étape 3: Mise à jour de votre iframe lecteur

**Dans votre JSX player** :
```typescript
{selectedSource && (
  <iframe
    src={selectedSource.url} // Utilise maintenant proxyUrl automatiquement
    width="100%"
    height="500px"
    allowFullScreen
    className="rounded-lg"
  />
)}
```

## 🧪 Test immédiat

### Test 1: Vérifier la réponse API
```bash
curl "https://api-anime-sama.onrender.com/api/episode/one-piece-1090-vostfr" | jq '.data.sources[0].proxyUrl'
```
**Résultat attendu** : URL proxy encodée

### Test 2: Tester l'embed directement
Ouvrez dans votre navigateur :
```
https://api-anime-sama.onrender.com/api/embed/one-piece-1090-vostfr
```
**Résultat attendu** : Page avec lecteur intégré fonctionnel

### Test 3: Intégrer dans votre page
```html
<iframe 
  src="https://api-anime-sama.onrender.com/api/embed/one-piece-1090-vostfr"
  width="100%" 
  height="500px"
  allowfullscreen>
</iframe>
```

## 📋 Configuration API

**Assurez-vous d'utiliser** :
```typescript
const API_BASE = 'https://api-anime-sama.onrender.com';
```

## 🔍 Structure de réponse avec CORS

Votre API retourne maintenant :
```json
{
  "success": true,
  "data": {
    "sources": [
      {
        "url": "https://anime-sama.fr/...",           // ← Bloqué par CORS
        "proxyUrl": "/api/proxy/https%3A%2F%2F...",  // ← Solution CORS
        "embedUrl": "/api/embed/one-piece-1090-vostfr", // ← Alternative
        "server": "Serveur Principal"
      }
    ],
    "embedUrl": "/api/embed/one-piece-1090-vostfr", // ← Page complète
    "corsInfo": {
      "note": "Use proxyUrl or embedUrl for direct access"
    }
  }
}
```

## 🎯 Résultat attendu

Après implémentation :
- ✅ Plus de message "Can't Open This Page"
- ✅ Vidéos qui se chargent correctement
- ✅ Navigation entre serveurs fonctionnelle
- ✅ Compatible tous navigateurs

## 🚀 Déploiement

1. Modifiez votre code selon les exemples ci-dessus
2. Testez avec `one-piece-1090-vostfr` 
3. Vérifiez que l'iframe se charge sans erreur
4. Déployez en production

Le problème CORS est résolu côté API. Il ne reste qu'à utiliser les URLs proxy dans votre interface.