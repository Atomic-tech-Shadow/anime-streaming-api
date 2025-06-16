# Déploiement sur Render

## Configuration automatique

Ce projet est configuré pour un déploiement automatique sur Render avec le fichier `render.yaml`.

## Étapes de déploiement

### 1. Préparation du repository
- Assurez-vous que votre code est sur GitHub
- Le fichier `render.yaml` contient toute la configuration nécessaire

### 2. Connexion à Render
1. Allez sur [render.com](https://render.com)
2. Connectez-vous avec votre compte GitHub
3. Cliquez sur "New +" et sélectionnez "Blueprint"

### 3. Configuration du Blueprint
1. Sélectionnez votre repository GitHub
2. Render détectera automatiquement le fichier `render.yaml`
3. Cliquez sur "Apply" pour déployer

### 4. Variables d'environnement
Les variables suivantes sont pré-configurées dans `render.yaml`:
- `NODE_ENV=production`
- `PORT=10000` (port requis par Render)
- `CACHE_TTL=300000` (5 minutes)
- `RATE_LIMIT_MAX=150` (requêtes par minute)
- `RATE_LIMIT_WINDOW=60000` (fenêtre d'1 minute)
- `REQUEST_TIMEOUT=20000` (20 secondes)
- `MAX_RETRY_ATTEMPTS=3`
- `CACHE_ENABLED=true`
- `AD_BLOCKING_ENABLED=true`
- `PASSIVE_AUTH_ENABLED=true`
- `SESSION_ROTATION_INTERVAL=1800000` (30 minutes)
- `MAX_REQUESTS_PER_SESSION=50`

### 5. Surveillance
- **Health Check**: Configuré sur `/api/health`
- **Auto-deploy**: Activé pour les commits sur la branche principale
- **Région**: Frankfurt (Europe) pour des performances optimales

## URLs après déploiement
- **API**: `https://anime-sama-api.onrender.com`
- **Documentation**: `https://anime-sama-api.onrender.com/docs`
- **Health Check**: `https://anime-sama-api.onrender.com/api/health`

## Endpoints disponibles
- `GET /` - Information de l'API
- `GET /docs` - Documentation complète
- `GET /api/health` - Vérification de santé
- `GET /api/status` - Statut détaillé
- `GET /api/search?q=naruto` - Recherche d'anime
- `GET /api/anime/{id}` - Détails d'un anime
- `GET /api/episode/{id}` - Sources de streaming
- `GET /api/trending` - Animes populaires
- `GET /api/catalogue` - Catalogue complet
- `GET /api/genres` - Liste des genres
- `GET /api/random` - Anime aléatoire
- `GET /api/advanced-search` - Recherche avancée

## Plan tarifaire
- **Starter (Gratuit)**: 512MB RAM, hibernation après 15min d'inactivité
- **Standard (Payant)**: Pas d'hibernation, plus de ressources

## Support et dépannage
- Les logs sont disponibles dans le dashboard Render
- Le serveur redémarre automatiquement en cas d'erreur
- Le health check surveille la disponibilité de l'API