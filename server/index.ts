import { createServer } from 'http';
import { parse } from 'url';
import { readFileSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Charger les variables d'environnement
dotenv.config();

const PORT = process.env.PORT || 5000;

// Fonction pour adapter les requêtes au format Vercel
function adaptRequest(req: any): VercelRequest {
  const url = parse(req.url || '', true);
  return {
    ...req,
    query: url.query || {},
    body: null,
    cookies: {},
    headers: req.headers || {}
  } as VercelRequest;
}

// Fonction pour adapter les réponses au format Vercel
function adaptResponse(res: any): VercelResponse {
  const vercelRes = {
    status: (code: number) => {
      res.statusCode = code;
      return {
        json: (data: any) => {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(data));
          return vercelRes;
        },
        send: (data: any) => {
          res.end(data);
          return vercelRes;
        }
      };
    },
    json: (data: any) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data));
      return vercelRes;
    },
    send: (data: any) => {
      res.end(data);
      return vercelRes;
    },
    setHeader: (name: string, value: string) => {
      res.setHeader(name, value);
      return vercelRes;
    },
    end: (data?: any) => {
      res.end(data);
      return vercelRes;
    }
  } as VercelResponse;

  return vercelRes;
}

const server = createServer(async (req, res) => {
  // Configuration CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  const url = parse(req.url || '', true);
  const pathname = url.pathname || '';

  console.log(`${req.method} ${pathname}`);

  try {
    const vercelReq = adaptRequest(req);
    const vercelRes = adaptResponse(res);

    // Router pour les différentes endpoints
    if (pathname === '/api/health') {
      const { default: handler } = await import('../api/health.js');
      await handler(vercelReq, vercelRes);
    } 
    else if (pathname === '/api/status') {
      const { default: handler } = await import('../api/status.js');
      await handler(vercelReq, vercelRes);
    }
    else if (pathname === '/api/search') {
      const { default: handler } = await import('../api/search.js');
      await handler(vercelReq, vercelRes);
    }
    else if (pathname.startsWith('/api/anime/')) {
      const id = pathname.split('/')[3];
      vercelReq.query = { ...vercelReq.query, id };
      const { default: handler } = await import('../api/anime/[id].js');
      await handler(vercelReq, vercelRes);
    }
    else if (pathname.startsWith('/api/episode/')) {
      const id = pathname.split('/')[3];
      vercelReq.query = { ...vercelReq.query, id };
      const { default: handler } = await import('../api/episode/[id].js');
      await handler(vercelReq, vercelRes);
    }
    else if (pathname === '/api/trending') {
      const { default: handler } = await import('../api/trending.js');
      await handler(vercelReq, vercelRes);
    }
    else if (pathname === '/api/catalogue') {
      const { default: handler } = await import('../api/catalogue.js');
      await handler(vercelReq, vercelRes);
    }
    else if (pathname === '/api/genres') {
      const { default: handler } = await import('../api/genres.js');
      await handler(vercelReq, vercelRes);
    }
    else if (pathname === '/api/random') {
      const { default: handler } = await import('../api/random.js');
      await handler(vercelReq, vercelRes);
    }
    else if (pathname === '/api/advanced-search') {
      const { default: handler } = await import('../api/advanced-search.js');
      await handler(vercelReq, vercelRes);
    }
    else if (pathname === '/api/seasons') {
      const { default: handler } = await import('../api/seasons.js');
      await handler(vercelReq, vercelRes);
    }
    else if (pathname === '/api/content') {
      const { default: handler } = await import('../api/content.js');
      await handler(vercelReq, vercelRes);
    }
    else if (pathname === '/api/content-types') {
      const { default: handler } = await import('../api/content-types.js');
      await handler(vercelReq, vercelRes);
    }
    else if (pathname === '/docs') {
      const { default: handler } = await import('../api/docs.js');
      await handler(vercelReq, vercelRes);
    }
    else if (pathname.startsWith('/api/embed/')) {
      // Handle embed URLs like /api/embed/anime-episode-1-vostfr
      const episodeId = pathname.replace('/api/embed/', '');
      vercelReq.query = { ...vercelReq.query, episodeId };
      const { default: handler } = await import('../api/embed/[episodeId].js');
      await handler(vercelReq, vercelRes);
    }
    else if (pathname.startsWith('/api/proxy/')) {
      // Handle proxy URLs like /api/proxy/https%3A%2F%2Fexample.com
      const encodedUrl = pathname.replace('/api/proxy/', '');
      const urlParts = encodedUrl.split('/');
      vercelReq.query = { ...vercelReq.query, url: urlParts };
      const { default: handler } = await import('../api/proxy/[...url].js');
      await handler(vercelReq, vercelRes);
    }
    else if (pathname.startsWith('/embed/')) {
      // Handle embed URLs like /embed/anime-episode-1-vostfr
      const episodeId = pathname.replace('/embed/', '');
      vercelReq.query = { ...vercelReq.query, id: episodeId };
      const { default: handler } = await import('../api/episode/[id].js');
      await handler(vercelReq, vercelRes);
    }
    else if (pathname === '/demo' || pathname === '/anime-sama-demo') {
      // Serve the comprehensive anime-sama demo page
      const { default: handler } = await import('../api/anime-sama-demo.js');
      await handler(vercelReq, vercelRes);
    }
    else if (pathname === '/demo-simple') {
      // Serve the simple demo page
      try {
        const htmlContent = readFileSync(join(process.cwd(), 'client', 'index.html'), 'utf-8');
        res.setHeader('Content-Type', 'text/html');
        res.statusCode = 200;
        res.end(htmlContent);
      } catch (error) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/html');
        res.end('<h1>Demo page not found</h1><p>The demo page could not be loaded.</p>');
      }
    }
    else if (pathname.startsWith('/client/src/styles/')) {
      // Serve CSS files
      try {
        const filePath = pathname.replace('/client/src/styles/', '');
        const cssContent = readFileSync(join(process.cwd(), 'client', 'src', 'styles', filePath), 'utf-8');
        res.setHeader('Content-Type', 'text/css');
        res.statusCode = 200;
        res.end(cssContent);
      } catch (error) {
        res.statusCode = 404;
        res.end('CSS file not found');
      }
    }
    else if (pathname === '/' || pathname === '/api') {
      const { default: handler } = await import('../api/index.js');
      await handler(vercelReq, vercelRes);
    }
    else {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Not Found', path: pathname }));
    }
  } catch (error: any) {
    console.error('Erreur serveur:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ 
      error: 'Internal Server Error', 
      message: error.message,
      path: pathname
    }));
  }
});

server.listen(parseInt(PORT.toString()), '0.0.0.0', () => {
  console.log(`🚀 API Anime Sama démarrée sur http://0.0.0.0:${PORT}`);
  console.log(`📚 Documentation: http://0.0.0.0:${PORT}/docs`);
  console.log(`🔍 Test: http://0.0.0.0:${PORT}/api/health`);
  console.log(`🎬 Démo Anime-Sama Corrigée: http://0.0.0.0:${PORT}/demo`);
});

// Gestion propre de l'arrêt
process.on('SIGTERM', () => {
  console.log('Arrêt du serveur...');
  server.close();
});

process.on('SIGINT', () => {
  console.log('Arrêt du serveur...');
  server.close();
  process.exit(0);
});