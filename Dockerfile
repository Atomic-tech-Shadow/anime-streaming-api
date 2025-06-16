# Dockerfile pour déploiement Render
FROM node:20-alpine

# Variables d'environnement
ENV NODE_ENV=production
ENV PORT=10000

# Répertoire de travail
WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer toutes les dépendances (nécessaire pour la construction)
RUN npm ci

# Copier le code source
COPY . .

# Créer le répertoire de distribution et compiler TypeScript
RUN mkdir -p dist && npx tsc --project tsconfig.prod.json

# Exposer le port
EXPOSE $PORT

# Santé check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:$PORT/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Démarrer l'application
CMD ["node", "dist/server/index.js"]