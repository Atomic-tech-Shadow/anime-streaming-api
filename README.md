# Anime-Sama API

API REST Node.js qui scrape anime-sama.fr pour fournir des fonctionnalités de recherche d'anime, détails et liens de streaming.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)

## Fonctionnalités Principales

- **Recherche d'anime** - Recherche par titre
- **Détails d'anime** - Informations complètes avec épisodes et saisons
- **Liens de streaming** - Sources multiples (VF/VOSTFR) avec serveurs variés
- **Anime tendances** - Liste des anime populaires
- **Catalogue complet** - Navigation avec filtres
- **Recherche avancée** - Filtres multiples
- **Cache intelligent** - Mise en cache en mémoire avec TTL
- **Documentation** - Interface web interactive
- **Rate limiting** - Protection contre le spam

## Installation

### Prérequis
- Node.js 20+
- npm

### 1. Cloner le projet
```bash
git clone https://github.com/votre-username/anime-sama-api.git
cd anime-sama-api
```

### 2. Installer les dépendances
```bash
npm install
```

### 3. Démarrer le serveur
```bash
npm run dev
```

L'API sera disponible sur `http://localhost:5000`

## Endpoints API

### Recherche d'anime
```http
GET /api/search?q={query}
```

### Détails d'un anime
```http
GET /api/anime/{id}
```

### Streaming d'un épisode
```http
GET /api/episode/{episodeId}
```

### Épisodes par saison
```http
GET /api/seasons?animeId={id}&season={number}&language={vf|vostfr}
```

### Anime tendances
```http
GET /api/trending
```

### Catalogue
```http
GET /api/catalogue
```

### Recherche avancée
```http
GET /api/advanced-search
```

### Anime aléatoire
```http
GET /api/random
```

### Genres disponibles
```http
GET /api/genres
```

### État de l'API
```http
GET /api/health
GET /api/status
```

### Documentation
```http
GET /docs
```

## Architecture

- **Framework**: Express.js + TypeScript
- **Scraping**: Cheerio + Axios avec rotation User-Agent
- **Cache**: Système en mémoire avec TTL
- **Source**: Scraping temps réel anime-sama.fr

## API de Production

API déployée disponible à : `https://api-anime-sama.onrender.com`

Exemple d'utilisation :
```bash
curl "https://api-anime-sama.onrender.com/api/search?q=one%20piece"
```

## Licence

MIT License

## Avertissement

Cette API est destinée à des fins éducatives. Respectez les conditions d'utilisation d'anime-sama.fr et les lois locales.
