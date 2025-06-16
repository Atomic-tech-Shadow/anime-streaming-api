# 🎌 Anime-Sama API

Une API REST Node.js complète qui scrape anime-sama.fr pour fournir des fonctionnalités de recherche d'anime, détails et liens de streaming pour applications mobiles.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB.svg)](https://reactjs.org/)

## ✨ Fonctionnalités Principales

- 🔍 **Recherche d'anime** - Recherche par titre avec pagination
- 📖 **Détails d'anime** - Informations complètes avec épisodes et saisons
- 🎬 **Liens de streaming** - Sources multiples (VF/VOSTFR) avec serveurs variés
- 📈 **Anime tendances** - Liste des anime populaires en temps réel
- 📚 **Catalogue complet** - Navigation avec filtres et pagination
- 🗓️ **Planning** - Calendrier de sortie des épisodes
- 🎲 **Anime aléatoire** - Découverte d'anime au hasard
- 📖 **Scans manga** - Détails des chapitres disponibles
- 🔍 **Recherche avancée** - Filtres multiples pour recherche précise
- 💾 **Cache intelligent** - Mise en cache en mémoire avec TTL
- 🌐 **Interface web** - Documentation interactive et tests API
- ⚡ **Limitation de débit** - Protection contre le spam (100 req/min)

## 🚀 Installation Rapide

### Prérequis
- Node.js 20+
- npm ou yarn

### 1. Cloner le projet
```bash
git clone https://github.com/votre-username/animesama-streaming-api.git
cd animesama-streaming-api
```

### 2. Installer les dépendances
```bash
npm install
```

### 3. Démarrer le serveur
```bash
# Mode développement (avec hot reload)
npm run dev

# Mode production
npm run build && npm start
```

L'API sera disponible sur `http://localhost:5000`
Interface web: `http://localhost:5000` (documentation interactive)

## 📚 Endpoints API Complets

### 🔍 Recherche d'anime
```http
GET /api/search?query={titre}&page={numéro}
```

**Exemple:**
```bash
curl "https://api-anime-sama.onrender.com/api/search?query=one%20piece"
```

### 📖 Détails d'un anime
```http
GET /api/anime/{id}
```

**Exemple:**
```bash
curl "https://api-anime-sama.onrender.com/api/anime/one-piece"
```

### 🎬 Streaming d'un épisode
```http
GET /api/episode/{episodeId}
```

**Exemple:**
```bash
curl "https://api-anime-sama.onrender.com/api/episode/one-piece-1"
```

**Réponse exemple:**
```json
{
  "episodeId": "one-piece-1",
  "episodeNumber": "1",
  "sources": [
    {
      "url": "https://vidmoly.to/embed/abc123",
      "server": "Vidmoly",
      "language": "VOSTFR",
      "quality": "1080p",
      "playerType": "iframe"
    },
    {
      "url": "https://sendvid.com/embed/def456",
      "server": "SendVid",
      "language": "VF",
      "quality": "720p",
      "playerType": "iframe"
    }
  ]
}
```

### 📈 Anime tendances
```http
GET /api/trending
```

### 📚 Catalogue complet
```http
GET /api/catalogue?page={numéro}&genre={genre}&status={statut}&type={type}
```

### 🗓️ Planning des sorties
```http
GET /api/planning?date={YYYY-MM-DD}
```

### 🎲 Anime aléatoire
```http
GET /api/random
```

### 🔍 Recherche avancée
```http
GET /api/search/advanced?genre={genre}&year={année}&status={statut}&type={type}
```

### 📝 Épisodes et saisons
```http
GET /api/anime/{id}/episodes
GET /api/anime/{id}/season/{seasonNumber}/episodes
```

### 📖 Scans manga
```http
GET /api/scan/{id}?chapter={numéro}
```

### 🏷️ Genres disponibles
```http
GET /api/genres
```

### ⚕️ État de l'API
```http
GET /api/status
GET /api/health
```

## 🚀 Déploiement

### 🌐 Vercel (Recommandé)
Le projet est configuré pour un déploiement Vercel en un clic:

1. **Fork le repository sur GitHub**
2. **Connecter à Vercel**:
   - Aller sur [vercel.com](https://vercel.com)
   - Importer le projet GitHub
   - Déployer automatiquement

3. **Configuration automatique**:
   - `vercel.json` déjà configuré
   - API serverless avec Node.js 20
   - Timeout de 60 secondes
   - Routes automatiques

### ☁️ Autres plateformes

#### Render
```bash
# Build: npm install && npm run build
# Start: npm start
```

#### Railway
```bash
# Procfile automatiquement détecté
# Port: Variable $PORT
```

#### Replit
```bash
# Run: npm run dev
# Port: 5000 (configuré automatiquement)
```

## ⚙️ Variables d'environnement

```env
# Optionnel - Port du serveur (défaut: 5000)
PORT=5000

# Optionnel - Node environment
NODE_ENV=production
```

## 🔒 Sécurité et Performance

### Fonctionnalités intégrées:
- **User-Agent rotatifs** - Évite la détection par anime-sama.fr
- **Cache intelligent** - TTL de 5 minutes en mémoire
- **Limitation de débit** - 100 requêtes/minute par IP
- **Timeout requests** - 20 secondes maximum
- **Headers anti-tracking** - DNT activé
- **Filtres anti-pub** - Bloque les URLs publicitaires
- **CORS activé** - Support cross-origin
- **Gestion d'erreurs** - Réponses standardisées

### Codes de statut HTTP:
- `200` - Succès
- `400` - Requête invalide
- `404` - Ressource non trouvée
- `429` - Trop de requêtes (rate limit)
- `500` - Erreur serveur

## 🧪 Tests et Développement

### Interface de test intégrée
Accédez à `http://localhost:5000` pour:
- Documentation interactive
- Tests en temps réel de tous les endpoints
- Exemples de réponses
- Monitoring du cache et statut API

### Tests en ligne de commande
```bash
# Test recherche
curl "http://localhost:5000/api/search?query=naruto"

# Test détails anime
curl "http://localhost:5000/api/anime/one-piece"

# Test statut API
curl "http://localhost:5000/api/status"
```

## 📊 Architecture Technique

### Backend
- **Framework**: Express.js + TypeScript
- **Scraping**: Cheerio + Axios avec rotation User-Agent
- **Cache**: Système en mémoire avec TTL
- **Build**: ESBuild pour la production

### Frontend
- **Framework**: React 18 + TypeScript
- **UI**: shadcn/ui + Tailwind CSS
- **État**: TanStack Query
- **Routing**: Wouter
- **Build**: Vite

### Données
- **Source**: Scraping temps réel anime-sama.fr
- **Pas de base de données** - Architecture stateless
- **Cache TTL**: 5 minutes pour optimiser les performances

## 🤝 Contribution

1. Fork le projet
2. Créer une branche: `git checkout -b feature/nouvelle-fonctionnalite`
3. Commit: `git commit -m 'Ajout nouvelle fonctionnalité'`
4. Push: `git push origin feature/nouvelle-fonctionnalite`
5. Ouvrir une Pull Request

## 📄 Licence

MIT License - Libre d'utilisation pour vos projets.

## ⚠️ Avertissement

Cette API est destinée à des fins éducatives. Respectez les conditions d'utilisation d'anime-sama.fr et les lois locales sur le copyright.
