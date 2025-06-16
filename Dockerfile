# Dockerfile pour déploiement Render
FROM node:20-alpine

# Variables d'environnement
ENV NODE_ENV=production
ENV PORT=10000

# Répertoire de travail
WORKDIR /app

# Installer les outils de build nécessaires
RUN apk add --no-cache python3 make g++

# Copier package.json seulement
COPY package.json ./

# Nettoyer npm cache et installer les dépendances
RUN npm cache clean --force && \
    npm install --no-package-lock --production=false && \
    npm install -g typescript

# Copier le code source
COPY . .

# Créer le répertoire de distribution et compiler TypeScript
RUN mkdir -p dist && \
    tsc --project tsconfig.prod.json && \
    cp package.prod.json dist/package.json

# Installer uniquement les dépendances de production dans dist
WORKDIR /app/dist
RUN npm install --production --no-package-lock

# Retourner au répertoire principal
WORKDIR /app

# Exposer le port
EXPOSE $PORT

# Santé check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:$PORT/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Démarrer l'application
WORKDIR /app/dist
CMD ["node", "server/index.js"]