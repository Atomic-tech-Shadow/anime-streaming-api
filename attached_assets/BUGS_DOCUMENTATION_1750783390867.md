# Documentation des Bugs - Plateforme Anime

## Bugs Critiques Identifiés (24 juin 2025)

### 1. My Hero Academia Saison 7 - Épisodes Manquants
**Problème**: Les épisodes de la saison 7 ne se chargent pas
**Statut**: 🔴 Critique
**Tests effectués**:
```bash
curl "https://api-anime-sama.onrender.com/api/anime/my-hero-academia"
# Retourne: 7 saisons détectées dont saison 7

curl "https://api-anime-sama.onrender.com/api/seasons?animeId=my-hero-academia&season=7&language=vostfr"
# Retourne: {"episodes":[],"totalEpisodes":0}
```

**Cause identifiée**: 
- API détecte la saison 7 mais ne retourne aucun épisode
- Routes `/api/seasons` retournent des tableaux vides
- Configuration du lecteur utilise encore anciennes routes

**Impact**: Utilisateurs ne peuvent pas regarder MHA saison 7

### 2. One Piece Saga 11 - Navigation Limitée
**Problème**: Interface n'affiche qu'une seule saison au lieu des 12 sagas
**Statut**: 🔴 Critique
**Tests effectués**:
```bash
curl "https://api-anime-sama.onrender.com/api/anime/one-piece"
# Retourne: 12 sagas détectées (Saga 1 à 11 + Films)

curl "https://api-anime-sama.onrender.com/api/seasons?animeId=one-piece&season=11&language=vf"
# Retourne: données tronquées ou vides
```

**Cause identifiée**:
- Interface anime-sama.tsx limite l'affichage des saisons
- Problème de mapping entre sagas et interface utilisateur
- Épisode 1087 VF non accessible via navigation

**Impact**: Utilisateurs ne peuvent pas naviguer vers les dernières sagas

### 3. Configuration Lecteur Vidéo - Anciennes Routes
**Problème**: Le lecteur utilise encore des configurations obsolètes
**Statut**: 🟡 Modéré
**Localisation**: `client/src/pages/anime-sama.tsx` lignes 1100-1200

**Détails techniques**:
- Endpoint `/api/episode/{episodeId}` non conforme
- Génération d'ID d'épisodes incorrecte: `${anime}-episode-${numero}-${langue}`
- Configuration embed utilise mauvaises URLs

**Impact**: Lecteur vidéo peut ne pas fonctionner correctement

### 4. Gestion des Langues VF/VOSTFR
**Problème**: Fallback automatique VF/VOSTFR défaillant
**Statut**: 🟡 Modéré

**Cause**:
- Logique de détection des langues disponibles incomplète
- Routes API inconsistantes entre `vf` et `vostfr`
- Interface ne propose pas toutes les langues disponibles

**Impact**: Utilisateurs ne peuvent pas choisir leur langue préférée

## Actions Recommandées

### Priorité 1 (Critique)
1. Corriger les routes API pour My Hero Academia saison 7
2. Fixer l'affichage des sagas One Piece (1-11)
3. Mettre à jour la configuration du lecteur vidéo

### Priorité 2 (Important)
1. Standardiser les endpoints API seasons
2. Améliorer la gestion des langues VF/VOSTFR
3. Optimiser les fallbacks automatiques

### Tests de Validation
- [ ] My Hero Academia saison 7 épisodes se chargent
- [ ] One Piece saga 11 épisode 1087 VF accessible
- [ ] Lecteur vidéo fonctionne avec nouvelles configurations
- [ ] Navigation entre toutes les saisons/sagas

## Environnement de Test
- API: https://api-anime-sama.onrender.com
- Frontend: Replit deployment
- Base de données: PostgreSQL Neon
- Tests effectués: 24 juin 2025 16:30 UTC