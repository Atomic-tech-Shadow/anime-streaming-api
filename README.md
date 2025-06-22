# Anime-Sama API

API REST Node.js qui scrape anime-sama.fr pour fournir des fonctionnalités de recherche d'anime, détails et liens de streaming.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)

## Fonctionnalités Principales

- **Système Universel** - Fonctionne avec tous les animes disponibles sur anime-sama.fr sans configuration spécifique
- **Données Authentiques** - Extraction automatique des vraies données depuis anime-sama.fr (épisodes, films, saisons)
- **Recherche d'anime** - Recherche par titre avec résultats précis
- **Détails d'anime** - Informations complètes avec structure réelle détectée automatiquement
- **Liens de streaming** - Sources multiples (VF/VOSTFR) extraites directement des serveurs
- **Détection Intelligente** - Analyse automatique des fichiers episodes.js pour compter les vrais épisodes
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

**Nouveau**: Détection automatique du nombre réel d'épisodes depuis anime-sama.fr

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

### Système Universel
- **Détection Automatique**: Analyse dynamique de la structure de chaque anime
- **Pas de Configuration**: Aucune configuration spécifique par anime requise
- **Données Réelles**: Extraction directe depuis les fichiers episodes.js d'anime-sama.fr
- **Fallback Intelligent**: Tests multiples d'URLs pour trouver les bonnes sources

### Technologies
- **Framework**: Express.js + TypeScript
- **Scraping**: Cheerio + Axios avec rotation User-Agent
- **Cache**: Système en mémoire avec TTL
- **Source**: Scraping temps réel anime-sama.fr avec extraction authentique
- **Validation**: Vérification des données pour éviter les valeurs incorrectes

## API de Production

API déployée disponible à : `https://api-anime-sama.onrender.com`

Exemple d'utilisation :
```bash
curl "https://api-anime-sama.onrender.com/api/search?q=one%20piece"
```

## Licence

MIT License

## Exemples d'Utilisation

### Recherche d'anime
```bash
curl "http://localhost:5000/api/search?query=jujutsu+kaisen"
```

### Obtenir les épisodes avec données réelles
```bash
curl "http://localhost:5000/api/seasons?animeId=chainsaw-man&season=1&language=vostfr"
# Retourne 12 épisodes réels extraits depuis anime-sama.fr
```

### Streaming d'un épisode
```bash
curl "http://localhost:5000/api/episode/demon-slayer-episode-1-vostfr"
# Sources multiples extraites automatiquement
```

## Avantages du Système Universel

- **Aucune Maintenance**: Pas besoin de configurer chaque anime individuellement
- **Données Précises**: Nombre d'épisodes exact extrait du site source
- **Évolutif**: Fonctionne automatiquement avec les nouveaux animes ajoutés sur anime-sama.fr
- **Fiable**: Fallback intelligent si une URL ne fonctionne pas

## Avertissement

Cette API est destinée à des fins éducatives. Respectez les conditions d'utilisation d'anime-sama.fr et les lois locales.
