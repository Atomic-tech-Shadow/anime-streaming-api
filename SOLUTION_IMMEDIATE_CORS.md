# Solution Immédiate CORS - Message "Can't Open This Page"

## Problème confirmé
Vous voyez ce message car l'API de production sur Render n'a pas encore les endpoints CORS que nous avons créés localement.

## Solution immédiate (2 options)

### Option 1: Utiliser l'API locale pour tester
```typescript
// Dans votre anime-sama.tsx, temporairement:
const API_BASE = 'http://localhost:5000'; // Au lieu de Render
```

Puis dans votre fonction `loadEpisodeSources`:
```typescript
const loadEpisodeSources = async (episodeId: string) => {
  try {
    const response = await fetch(`${API_BASE}/api/episode/${episodeId}`);
    const apiResponse = await response.json();
    
    if (apiResponse.success) {
      // Utiliser proxyUrl pour résoudre CORS
      const sources = apiResponse.data.sources.map(source => ({
        ...source,
        url: source.proxyUrl // Solution CORS
      }));
      
      setEpisodeSources(sources);
      setSelectedSource(sources[0]);
    }
  } catch (err) {
    setError('Erreur lors du chargement des sources');
  }
};
```

### Option 2: Utiliser directement l'embed local
```typescript
const playEpisode = (episodeId: string) => {
  const embedUrl = `http://localhost:5000/api/embed/${episodeId}`;
  setVideoUrl(embedUrl);
};
```

## Test immédiat
1. Changez `API_BASE` vers localhost
2. Testez avec "one-piece-1090-vostfr"
3. Le message "Can't Open This Page" disparaîtra
4. La vidéo se chargera correctement

## Déploiement sur Render
Pour mettre à jour Render avec les endpoints CORS, il faudra redéployer avec les nouveaux fichiers:
- `/api/proxy/[...url].ts`
- `/api/embed/[episodeId].ts`
- Modifications dans `/api/episode/[id].ts`

## Résultat attendu
- Plus de message d'erreur CORS
- Lecteur vidéo fonctionnel
- Navigation entre serveurs opérationnelle