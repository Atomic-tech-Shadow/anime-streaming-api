import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Charger les variables d'environnement
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes de l'API - import dynamique des handlers Vercel
app.get('/api/health', async (req, res) => {
  try {
    const { default: handler } = await import('./api/health.ts');
    await handler(req, res);
  } catch (error) {
    res.status(500).json({ error: 'Health check failed', details: error.message });
  }
});

app.get('/api/status', async (req, res) => {
  try {
    const { default: handler } = await import('./api/status.ts');
    await handler(req, res);
  } catch (error) {
    res.status(500).json({ error: 'Status check failed', details: error.message });
  }
});

app.get('/api/search', async (req, res) => {
  try {
    const { default: handler } = await import('./api/search.ts');
    await handler(req, res);
  } catch (error) {
    res.status(500).json({ error: 'Search failed', details: error.message });
  }
});

app.get('/api/anime/:id', async (req, res) => {
  try {
    const { default: handler } = await import('./api/anime/[id].ts');
    await handler(req, res);
  } catch (error) {
    res.status(500).json({ error: 'Anime details failed', details: error.message });
  }
});

app.get('/api/episode/:id', async (req, res) => {
  try {
    const { default: handler } = await import('./api/episode/[id].ts');
    await handler(req, res);
  } catch (error) {
    res.status(500).json({ error: 'Episode details failed', details: error.message });
  }
});

app.get('/api/trending', async (req, res) => {
  try {
    const { default: handler } = await import('./api/trending.ts');
    await handler(req, res);
  } catch (error) {
    res.status(500).json({ error: 'Trending failed', details: error.message });
  }
});

app.get('/api/catalogue', async (req, res) => {
  try {
    const { default: handler } = await import('./api/catalogue.ts');
    await handler(req, res);
  } catch (error) {
    res.status(500).json({ error: 'Catalogue failed', details: error.message });
  }
});

app.get('/api/genres', async (req, res) => {
  try {
    const { default: handler } = await import('./api/genres.ts');
    await handler(req, res);
  } catch (error) {
    res.status(500).json({ error: 'Genres failed', details: error.message });
  }
});

app.get('/api/random', async (req, res) => {
  try {
    const { default: handler } = await import('./api/random.ts');
    await handler(req, res);
  } catch (error) {
    res.status(500).json({ error: 'Random anime failed', details: error.message });
  }
});

app.get('/docs', async (req, res) => {
  try {
    const { default: handler } = await import('./api/docs.ts');
    await handler(req, res);
  } catch (error) {
    res.status(500).json({ error: 'Documentation failed', details: error.message });
  }
});

// Route par défaut
app.get('/', async (req, res) => {
  try {
    const { default: handler } = await import('./api/index.ts');
    await handler(req, res);
  } catch (error) {
    res.status(500).json({ error: 'API index failed', details: error.message });
  }
});

// Démarrage du serveur
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Serveur API démarré sur http://0.0.0.0:${PORT}`);
  console.log(`📚 Documentation disponible sur http://0.0.0.0:${PORT}/docs`);
  console.log(`🔍 Test de santé sur http://0.0.0.0:${PORT}/api/health`);
});