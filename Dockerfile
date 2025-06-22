# Anime-Sama API Docker Configuration
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json ./
COPY package-lock.json* ./

# Install all dependencies (including dev for tsx)
RUN npm install

# Copy source code
COPY . .

# Expose port
EXPOSE 5000

# Environment variables
ENV NODE_ENV=development
ENV PORT=5000

# Start application with tsx
CMD ["npx", "tsx", "server/index.ts"]