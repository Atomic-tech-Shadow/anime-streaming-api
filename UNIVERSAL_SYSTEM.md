# Système Universel Anime-Sama API

## Vue d'ensemble

L'API Anime-Sama utilise maintenant un système complètement universel qui fonctionne avec tous les animes disponibles sur anime-sama.fr sans nécessiter de configuration spécifique par anime.

## Fonctionnement du Système Universel

### 1. Détection Automatique des Épisodes

Le système extrait automatiquement le nombre réel d'épisodes pour chaque anime en analysant directement les fichiers `episodes.js` d'anime-sama.fr.

```typescript
// Processus d'extraction automatique
async function extractRealEpisodeCount(animeId: string, animeDetails: any): Promise<number> {
  // Teste plusieurs URLs possibles
  const urlsToTry = [
    `https://anime-sama.fr/catalogue/${animeId}/saison1/vostfr/episodes.js`,
    `https://anime-sama.fr/catalogue/${animeId}/version-2011/vostfr/episodes.js`,
    `https://anime-sama.fr/catalogue/${animeId}/avec-fillers/vostfr/episodes.js`,
    // ... autres patterns
  ];
  
  // Analyse les variables eps1, eps2, eps3, eps4
  // Compte les URLs réelles pour déterminer le nombre d'épisodes
}
```

### 2. Exemples de Détection Réussie

#### Chainsaw Man
- **Détection**: 12 épisodes réels trouvés dans `saison1/vostfr/episodes.js`
- **Ancien système**: Affichait incorrectement 1 épisode
- **Nouveau système**: 12 épisodes authentiques

#### Jujutsu Kaisen  
- **Détection**: 24 épisodes réels (96 URLs / 4 serveurs)
- **Ancien système**: Affichait incorrectement 2 épisodes
- **Nouveau système**: 24 épisodes authentiques

#### Tokyo Ghoul
- **Détection**: 12 épisodes réels (36 URLs / 3 serveurs)
- **Ancien système**: Estimation générique
- **Nouveau système**: 12 épisodes authentiques

### 3. Stratégie de Fallback Intelligent

Le système teste plusieurs patterns d'URL pour chaque anime :

1. **URLs Standard**: `saison1`, `saison2`, etc.
2. **URLs Spéciales**: `version-2011`, `avec-fillers`, etc.
3. **URLs Dynamiques**: Basées sur les noms de saisons détectés
4. **Analyse HTML**: Si les episodes.js ne sont pas trouvés

### 4. Avantages du Système

#### Zéro Configuration
- Aucun mapping hardcodé nécessaire
- Fonctionne automatiquement avec nouveaux animes
- Maintenance réduite à zéro

#### Données Authentiques
- Extraction directe depuis la source
- Nombres d'épisodes exacts
- Plus de données synthétiques

#### Évolutivité
- S'adapte automatiquement aux changements d'anime-sama.fr
- Détection intelligente de nouveaux patterns
- Robustesse face aux modifications du site

## Endpoints Améliorés

### `/api/seasons`
```bash
# Production
GET https://api-anime-sama.onrender.com/api/seasons?animeId=chainsaw-man&season=1&language=vostfr

# Local
GET http://localhost:5000/api/seasons?animeId=chainsaw-man&season=1&language=vostfr

# Réponse avec données réelles :
{
  "totalEpisodes": 12,  // Extrait depuis episodes.js
  "episodes": [...]     // 12 épisodes authentiques
}
```

### `/api/anime/{id}`
```bash
# Production
GET https://api-anime-sama.onrender.com/api/anime/jujutsu-kaisen

# Local
GET http://localhost:5000/api/anime/jujutsu-kaisen

# Détection automatique :
{
  "seasons": [...],
  "progressInfo": {
    "totalEpisodes": 24  // Nombre réel détecté
  }
}
```

## Logs de Détection

Le système affiche des logs détaillés pour suivre le processus :

```
🔍 Trying to extract episodes from: https://anime-sama.fr/catalogue/chainsaw-man/saison1/vostfr/episodes.js
✅ Found 12 episodes at https://anime-sama.fr/catalogue/chainsaw-man/saison1/vostfr/episodes.js
📊 Maximum episodes found: 12 for chainsaw-man
📊 Real episode count detected: 12 episodes for chainsaw-man
```

## Code d'Exemple

### Utilisation Simple
```javascript
// Configuration de l'API
const API_BASE = 'https://api-anime-sama.onrender.com'; // Production
// const API_BASE = 'http://localhost:5000'; // Local

// Rechercher un anime
const searchResults = await fetch(`${API_BASE}/api/search?query=demon+slayer`);

// Obtenir les épisodes avec données réelles
const episodes = await fetch(`${API_BASE}/api/seasons?animeId=demon-slayer&season=1&language=vostfr`);

// Le système détecte automatiquement le bon nombre d'épisodes
const data = await episodes.json();
console.log(data.totalEpisodes); // Nombre réel depuis anime-sama.fr
```

### Intégration Frontend
```javascript
// Configuration centralisée
const config = {
  apiUrl: 'https://api-anime-sama.onrender.com' // Utiliser l'API de production
};

// Plus besoin de gérer des cas spéciaux par anime
function loadAnimeEpisodes(animeId, season) {
  // Le système universel gère tout automatiquement
  return fetch(`${config.apiUrl}/api/seasons?animeId=${animeId}&season=${season}&language=vostfr`)
    .then(response => response.json())
    .then(data => {
      // data.totalEpisodes contient toujours le nombre réel
      // data.episodes contient la liste authentique
    });
}
```

## Conclusion

Le système universel garantit que l'API fonctionne de manière cohérente et précise avec tous les animes disponibles sur anime-sama.fr, sans nécessiter de maintenance constante ou de configurations spécifiques.