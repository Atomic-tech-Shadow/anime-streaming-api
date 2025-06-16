#!/bin/bash

# Script de pré-déploiement Vercel
# Vérifie la configuration avant le déploiement

set -e

echo "🚀 Préparation du déploiement Vercel..."

# Vérification des fichiers essentiels
echo "📋 Vérification des fichiers de configuration..."

if [ ! -f "vercel.json" ]; then
    echo "❌ vercel.json manquant"
    exit 1
fi

if [ ! -f "package.json" ]; then
    echo "❌ package.json manquant"
    exit 1
fi

if [ ! -f ".vercelignore" ]; then
    echo "⚠️  .vercelignore manquant (création automatique)"
    touch .vercelignore
fi

# Vérification TypeScript
echo "🔍 Vérification TypeScript..."
if command -v tsc &> /dev/null; then
    npm run check
    echo "✅ TypeScript valide"
else
    echo "⚠️  TypeScript non installé, saut de la vérification"
fi

# Test des endpoints critiques (si serveur local actif)
echo "🧪 Test des endpoints (optionnel)..."
if curl -s http://localhost:5000/api/health > /dev/null 2>&1; then
    echo "✅ API locale accessible"
    curl -s http://localhost:5000/api/status | head -c 100
    echo ""
else
    echo "⚠️  Serveur local non actif, tests ignorés"
fi

# Vérification des variables d'environnement
echo "🔐 Vérification des variables d'environnement..."
if [ -f ".env" ]; then
    echo "✅ Fichier .env présent"
else
    echo "⚠️  Pas de fichier .env local (normal pour Vercel)"
fi

# Nettoyage pre-deploy
echo "🧹 Nettoyage..."
rm -rf .vercel/output 2>/dev/null || true
rm -rf dist 2>/dev/null || true

echo ""
echo "🎉 Prêt pour le déploiement Vercel!"
echo ""
echo "Instructions:"
echo "1. Commitez vos changements: git add . && git commit -m 'Ready for deployment'"
echo "2. Pushez vers GitHub: git push origin main"
echo "3. Déployez sur Vercel: npx vercel --prod"
echo "   Ou utilisez l'interface web: https://vercel.com"
echo ""
echo "Variables d'environnement à configurer sur Vercel:"
echo "- SESSION_SECRET (obligatoire)"
echo "- CACHE_TTL (optionnel: 300000)"
echo "- RATE_LIMIT_MAX (optionnel: 150)"
echo ""