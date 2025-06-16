# 🚀 Guide de Déploiement Vercel

## Déploiement Automatique (Recommandé)

### 1. Préparation du Repository
```bash
# Assurez-vous que tous les fichiers sont commités
git add .
git commit -m "Configuration déploiement Vercel"
git push origin main
```

### 2. Déploiement sur Vercel
1. Allez sur [vercel.com](https://vercel.com)
2. Connectez votre compte GitHub
3. Cliquez sur "New Project"
4. Sélectionnez votre repository
5. Configuration automatique détectée
6. Cliquez sur "Deploy"

### 3. Configuration des Variables d'Environnement
Dans le dashboard Vercel > Settings > Environment Variables:

**Variables Obligatoires:**
- `SESSION_SECRET`: Clé secrète (32+ caractères)

**Variables Optionnelles (avec valeurs par défaut):**
- `CACHE_TTL`: 300000
- `RATE_LIMIT_MAX`: 150
- `REQUEST_TIMEOUT`: 25000

## Configuration Avancée

### Domaine Personnalisé
1. Settings > Domains
2. Ajouter votre domaine
3. Configurer les DNS selon les instructions

### Monitoring
- Performance: vercel.com/dashboard/analytics
- Erreurs: vercel.com/dashboard/functions
- Logs: vercel.com/dashboard/functions/logs

### Régions de Déploiement
Configuration actuelle: Europe (cdg1, fra1) + US East (iad1)

## Tests de Déploiement

```bash
# Test de base
curl https://votre-domaine.vercel.app/api/health

# Test recherche
curl "https://votre-domaine.vercel.app/api/search?query=naruto"

# Test détails anime
curl "https://votre-domaine.vercel.app/api/anime/one-piece"
```

## Optimisations Appliquées

### Performance
- Cache intelligent: 5 minutes TTL
- Compression Brotli automatique
- Headers de sécurité optimisés
- Timeout adaptatifs par endpoint

### Sécurité
- Headers de sécurité complets
- Rate limiting: 150 req/min
- User-Agent rotation automatique
- Protection anti-scraping

### Monitoring
- Health check automatique toutes les 10 minutes
- Métriques de performance intégrées
- Logs centralisés

## Résolution de Problèmes

### Erreurs Communes
1. **Timeout**: Augmenter `maxDuration` dans vercel.json
2. **Memory**: Augmenter `memory` pour les endpoints concernés
3. **Rate Limit**: Ajuster `RATE_LIMIT_MAX` dans les variables

### Support
- Documentation: vercel.com/docs
- Support: vercel.com/support
- Community: github.com/vercel/vercel/discussions