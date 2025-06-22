# Guide de Configuration - Anime-Sama API

## Installation et Configuration

### Prérequis

- **Node.js 20+** - Runtime JavaScript
- **npm** - Gestionnaire de paquets
- **TypeScript** - Compilation (installé automatiquement)

### Installation Rapide

#### 1. Cloner le projet
```bash
git clone <repository-url>
cd anime-sama-api
```

#### 2. Installation des dépendances
```bash
npm install
```

#### 3. Démarrage du serveur
```bash
# Mode développement
npm run dev

# Mode production
npm run build
npm start
```

Le serveur sera accessible sur `http://localhost:5000`

## Configuration du Système Universel

### Fonctionnement Automatique

L'API utilise un **système universel** qui ne nécessite aucune configuration manuelle :

- ✅ **Détection automatique** des animes
- ✅ **Extraction des vraies données** depuis anime-sama.fr
- ✅ **Zéro configuration** par anime
- ✅ **Fallback intelligent** pour les cas spéciaux

### Variables d'Environnement

Créer un fichier `.env` (optionnel) :

```env
# Port du serveur (par défaut: 5000)
PORT=5000

# Mode d'environnement
NODE_ENV=development

# Configuration du cache (optionnel)
CACHE_TTL=300000

# Configuration rate limiting (optionnel)
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=60000
```

## Structure du Projet

```
anime-sama-api/
├── api/                      # Endpoints API
│   ├── search.ts            # Recherche d'animes
│   ├── anime/[id].ts        # Détails d'un anime
│   ├── episode/[id].ts      # Sources de streaming
│   ├── seasons.ts           # Épisodes par saison
│   ├── lib/                 # Bibliothèques core
│   │   ├── anime-sama-navigator.ts    # Navigation intelligente
│   │   ├── core.ts                    # Utilitaires principaux
│   │   └── authentic-anime-sama-scraper.ts
│   └── ...
├── server/                   # Serveur Express
│   └── index.ts             # Point d'entrée principal
├── package.json             # Dépendances
└── README.md               # Documentation
```

## Configuration du Déploiement

### Développement Local

```bash
# Démarrage avec hot-reload
npm run dev

# Vérification TypeScript
npm run check

# Build de production
npm run build
```

### Déploiement Replit

1. **Configuration automatique** - Le projet est pré-configuré pour Replit
2. **Port 5000** - Binding automatique sur 0.0.0.0:5000
3. **Workflow configuré** - Démarrage automatique via "Start application"

### Déploiement Vercel

```bash
# Installation Vercel CLI
npm i -g vercel

# Déploiement
vercel --prod
```

### Configuration Docker (Optionnel)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["npm", "start"]
```

## Endpoints de l'API

### Endpoints Principaux

| Endpoint | Méthode | Description | Exemple |
|----------|---------|-------------|---------|
| `/api/search` | GET | Recherche d'animes | `?query=naruto` |
| `/api/anime/{id}` | GET | Détails d'un anime | `/api/anime/one-piece` |
| `/api/seasons` | GET | Épisodes par saison | `?animeId=demon-slayer&season=1` |
| `/api/episode/{id}` | GET | Sources de streaming | `/api/episode/naruto-episode-1-vostfr` |
| `/api/embed/{id}` | GET | Page de lecture | `/api/embed/naruto-episode-1-vostfr` |

### Endpoints Utilitaires

| Endpoint | Description |
|----------|-------------|
| `/api/health` | État de l'API |
| `/api/status` | Statistiques détaillées |
| `/docs` | Documentation interactive |
| `/demo` | Page de démonstration |

## Configuration Avancée

### Cache Personnalisé

```typescript
// api/lib/core.ts
export const cacheConfig = {
  ttl: process.env.CACHE_TTL || 300000, // 5 minutes
  maxSize: 1000 // Nombre maximum d'entrées
};
```

### Rate Limiting

```typescript
// Configuration dans core.ts
const rateLimitConfig = {
  max: process.env.RATE_LIMIT_MAX || 100,
  windowMs: process.env.RATE_LIMIT_WINDOW || 60000
};
```

### Headers CORS

```typescript
// Configuration automatique dans server/index.ts
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Authorization');
```

## Monitoring et Logs

### Logs Automatiques

L'API génère automatiquement des logs détaillés :

```
🔍 Recherche: "naruto"
📖 Consultation: one-piece
📺 12 saison(s) détectée(s) pour one-piece
✅ Found 26 episodes at https://anime-sama.fr/catalogue/demon-slayer/saison1/vostfr/episodes.js
```

### Endpoints de Monitoring

```bash
# Vérifier l'état de l'API
curl http://localhost:5000/api/health

# Statistiques détaillées
curl http://localhost:5000/api/status
```

## Dépannage

### Problèmes Courants

#### Port déjà utilisé
```bash
# Changer le port
PORT=3000 npm run dev
```

#### Erreurs TypeScript
```bash
# Vérifier les types
npm run check

# Nettoyer et réinstaller
rm -rf node_modules package-lock.json
npm install
```

#### Problèmes de scraping
```bash
# Tester un endpoint spécifique
curl "http://localhost:5000/api/health"

# Vérifier les logs pour les détails
```

### Logs de Debug

Activer les logs détaillés :

```env
NODE_ENV=development
DEBUG=anime-sama:*
```

## Sécurité

### Headers de Sécurité

L'API configure automatiquement :
- CORS pour les requêtes cross-origin
- Rate limiting par IP
- Validation des paramètres
- Headers de sécurité standard

### Bonnes Pratiques

- ✅ Utiliser HTTPS en production
- ✅ Configurer un reverse proxy (nginx)
- ✅ Monitorer les logs d'erreur
- ✅ Respecter les conditions d'anime-sama.fr

## Support

### Documentation
- **README.md** - Guide principal
- **UNIVERSAL_SYSTEM.md** - Système universel
- **/docs** - Documentation interactive
- **replit.md** - Historique et architecture

### Endpoints de Test
```bash
# Tester la recherche
curl "http://localhost:5000/api/search?query=demon+slayer"

# Tester les épisodes
curl "http://localhost:5000/api/seasons?animeId=chainsaw-man&season=1&language=vostfr"

# Tester le streaming
curl "http://localhost:5000/api/episode/demon-slayer-episode-1-vostfr"
```

L'API est conçue pour fonctionner de manière autonome avec une configuration minimale. Le système universel s'adapte automatiquement à tous les animes disponibles sur anime-sama.fr.