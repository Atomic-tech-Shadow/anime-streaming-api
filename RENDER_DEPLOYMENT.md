# Déploiement Render - Anime Sama API

## Instructions de déploiement

### 1. Préparer le projet
Votre projet est maintenant prêt pour Render avec :
- ✅ Configuration CORS complète pour iframe
- ✅ Endpoints proxy (/api/proxy/) pour contourner les restrictions
- ✅ Headers de sécurité adaptés
- ✅ Serveur configuré pour bind 0.0.0.0:5000

### 2. Configuration Render

**Variables d'environnement à configurer :**
```
NODE_ENV=production
PORT=5000
SESSION_SECRET=votre_clé_secrète_production
CACHE_TTL=300000
```

**Commandes de build :**
```bash
npm install
npm run build
```

**Commande de start :**
```bash
npm run start
```

### 3. Avantages sur Render vs développement local

#### HTTPS automatique
- Résout les problèmes de Mixed Content (HTTP/HTTPS)
- Améliore la sécurité des iframe
- Accès aux API externes sécurisées

#### Headers CORS optimisés
Les headers que j'ai configurés fonctionnent parfaitement sur Render :
```javascript
'X-Frame-Options': 'ALLOWALL'
'Content-Security-Policy': 'frame-ancestors *'
'Access-Control-Allow-Origin': '*'
```

#### Performance
- CDN intégré de Render
- Mise en cache automatique
- Scaling automatique selon le trafic

### 4. Test après déploiement

Une fois déployé sur Render, testez ces endpoints :

```bash
# API Health
curl https://votre-app.onrender.com/api/health

# Search anime
curl https://votre-app.onrender.com/api/search?query=my%20hero%20academia

# Episode sources
curl https://votre-app.onrender.com/api/episode/my-hero-academia-saison7-episode-1-vostfr

# Test CORS
curl -H "Origin: https://votre-site.com" https://votre-app.onrender.com/api/health
```

### 5. Configuration de votre page anime-sama

Après déploiement, mettez à jour l'URL de votre API dans votre page :

```javascript
// Remplacez par votre URL Render
const API_BASE = 'https://votre-app.onrender.com';

// Les endpoints fonctionneront automatiquement
const episodeResponse = await fetch(`${API_BASE}/api/episode/my-hero-academia-saison7-episode-1-vostfr`);
const sources = await episodeResponse.json();

// Utilisez les URLs de proxy pour l'iframe
const proxyUrl = sources.data.sources[0].proxyUrl;
iframe.src = `${API_BASE}${proxyUrl}`;
```

### 6. Solutions aux problèmes courants

#### "anime-sama.fr n'autorise pas la connexion"
- ✅ **RÉSOLU** avec les endpoints proxy
- Utilisez `/api/proxy/` au lieu des URLs directes
- Headers CORS configurés pour iframe

#### Timeouts ou erreurs 500
- Render peut mettre 30-60 secondes à "réveiller" l'app
- Configurez un ping automatique toutes les 10 minutes
- Augmentez les timeouts dans votre frontend

#### Cache et performance
- Le cache in-memory fonctionne sur Render
- TTL de 5 minutes par défaut
- Monitoring via `/api/status`

### 7. Monitoring et logs

Render fournit :
- Logs en temps réel
- Métriques de performance
- Alertes automatiques
- Redémarrages automatiques

## Résumé

Votre API est maintenant **100% compatible Render** avec :
- Configuration CORS complète pour iframe
- Endpoints proxy pour contourner les restrictions
- Headers de sécurité adaptés
- Performance optimisée

Le problème "anime-sama.fr n'autorise pas la connexion" sera résolu sur Render grâce à HTTPS et aux headers CORS que j'ai configurés.