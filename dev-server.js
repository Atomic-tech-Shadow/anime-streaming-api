#!/usr/bin/env node
import { createServer } from 'http';
import { parse } from 'url';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

const PORT = process.env.PORT || 5000;

// Fonction pour simuler les requêtes Vercel
function createVercelRequest(req) {
  const url = parse(req.url, true);
  return {
    ...req,
    query: url.query,
    body: null,
    cookies: {},
    headers: req.headers
  };
}

function createVercelResponse(res) {
  return {
    ...res,
    status: (code) => {
      res.statusCode = code;
      return {
        json: (data) => {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(data));
        },
        send: (data) => {
          res.end(data);
        }
      };
    },
    json: (data) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data));
    },
    send: (data) => {
      res.end(data);
    },
    setHeader: (name, value) => res.setHeader(name, value),
    end: (data) => res.end(data)
  };
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

  const url = parse(req.url, true);
  const pathname = url.pathname;

  console.log(`${req.method} ${pathname}`);

  try {
    const vercelReq = createVercelRequest(req);
    const vercelRes = createVercelResponse(res);

    // Router pour les différentes endpoints
    if (pathname === '/api/health') {
      const { default: handler } = await import('./api/health.ts');
      await handler(vercelReq, vercelRes);
    } 
    else if (pathname === '/api/status') {
      const { default: handler } = await import('./api/status.ts');
      await handler(vercelReq, vercelRes);
    }
    else if (pathname === '/api/search') {
      const { default: handler } = await import('./api/search.ts');
      await handler(vercelReq, vercelRes);
    }
    else if (pathname.startsWith('/api/anime/')) {
      const id = pathname.split('/')[3];
      vercelReq.query.id = id;
      const { default: handler } = await import('./api/anime/[id].ts');
      await handler(vercelReq, vercelRes);
    }
    else if (pathname.startsWith('/api/episode/')) {
      const id = pathname.split('/')[3];
      vercelReq.query.id = id;
      const { default: handler } = await import('./api/episode/[id].ts');
      await handler(vercelReq, vercelRes);
    }
    else if (pathname === '/api/trending') {
      const { default: handler } = await import('./api/trending.ts');
      await handler(vercelReq, vercelRes);
    }
    else if (pathname === '/api/catalogue') {
      const { default: handler } = await import('./api/catalogue.ts');
      await handler(vercelReq, vercelRes);
    }
    else if (pathname === '/api/genres') {
      const { default: handler } = await import('./api/genres.ts');
      await handler(vercelReq, vercelRes);
    }
    else if (pathname === '/api/random') {
      const { default: handler } = await import('./api/random.ts');
      await handler(vercelReq, vercelRes);
    }
    else if (pathname === '/api/advanced-search') {
      const { default: handler } = await import('./api/advanced-search.ts');
      await handler(vercelReq, vercelRes);
    }
    else if (pathname === '/docs') {
      const { default: handler } = await import('./api/docs.ts');
      await handler(vercelReq, vercelRes);
    }
    else if (pathname === '/' || pathname === '/api') {
      const { default: handler } = await import('./api/index.ts');
      await handler(vercelReq, vercelRes);
    }
    else {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Not Found', path: pathname }));
    }
  } catch (error) {
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

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 API Anime Sama démarrée sur http://0.0.0.0:${PORT}`);
  console.log(`📚 Documentation: http://0.0.0.0:${PORT}/docs`);
  console.log(`🔍 Test: http://0.0.0.0:${PORT}/api/health`);
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