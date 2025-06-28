import { createServer } from 'http';
import { parse } from 'url';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Charger les variables d'environnement
dotenv.config();

const PORT = process.env.PORT || 5000;

// Gestionnaire global pour les promesses rejetées non gérées
process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Promesse rejetée non gérée:', reason);
  console.error('Promise:', promise);
  // Ne pas faire crasher le serveur, juste logger l'erreur
});

// Gestionnaire pour les exceptions non capturées
process.on('uncaughtException', (error) => {
  console.error('🚨 Exception non capturée:', error);
  // Log et continuer en production
});

// Gestionnaire pour les warnings (optionnel)
process.on('warning', (warning) => {
  console.warn('⚠️ Warning:', warning.name, warning.message);
});

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
  // Configuration CORS renforcée
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Authorization, X-Frame-Options');
  res.setHeader('X-Frame-Options', 'ALLOWALL');
  res.setHeader('Content-Security-Policy', 'frame-ancestors *');
  
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

    // Router pour les endpoints documentés uniquement
    if (pathname === '/api/search') {
      const { default: handler } = await import('../api/search.js');
      await handler(vercelReq, vercelRes).catch((error: any) => {
        console.error('Erreur handler search:', error);
        throw error;
      });
    }
    else if (pathname === '/api/trending') {
      const { default: handler } = await import('../api/trending.js');
      await handler(vercelReq, vercelRes).catch((error: any) => {
        console.error('Erreur handler trending:', error);
        throw error;
      });
    }
    else if (pathname.startsWith('/api/anime/')) {
      const id = pathname.split('/')[3];
      vercelReq.query = { ...vercelReq.query, id };
      const { default: handler } = await import('../api/anime/[id].js');
      await handler(vercelReq, vercelRes).catch((error: any) => {
        console.error('Erreur handler anime:', error);
        throw error;
      });
    }
    else if (pathname.startsWith('/api/seasons/')) {
      const animeId = pathname.split('/')[3];
      vercelReq.query = { ...vercelReq.query, animeId };
      const { default: handler } = await import('../api/seasons/[animeId].js');
      await handler(vercelReq, vercelRes).catch((error: any) => {
        console.error('Erreur handler seasons/animeId:', error);
        throw error;
      });
    }
    else if (pathname === '/api/seasons') {
      const { default: handler } = await import('../api/seasons.js');
      await handler(vercelReq, vercelRes).catch((error: any) => {
        console.error('Erreur handler seasons:', error);
        throw error;
      });
    }
    else if (pathname.startsWith('/api/episodes/')) {
      const animeId = pathname.split('/')[3];
      vercelReq.query = { ...vercelReq.query, animeId };
      const { default: handler } = await import('../api/episodes/[animeId].js');
      await handler(vercelReq, vercelRes).catch((error: any) => {
        console.error('Erreur handler episodes/animeId:', error);
        throw error;
      });
    }
    else if (pathname.startsWith('/api/episode/')) {
      // Support des deux formats: /api/episode/:episodeId et /api/episode/:animeId/:seasonNumber/:episodeNumber
      const pathParts = pathname.split('/').slice(3); // Enlever '', 'api', 'episode'
      
      if (pathParts.length === 1) {
        // Format: /api/episode/:episodeId
        const episodeId = pathParts[0];
        vercelReq.query = { ...vercelReq.query, id: episodeId };
        const { default: handler } = await import('../api/episode/[id].js');
        await handler(vercelReq, vercelRes).catch((error: any) => {
          console.error('Erreur handler episode:', error);
          throw error;
        });
      } else if (pathParts.length === 3) {
        // Format: /api/episode/:animeId/:seasonNumber/:episodeNumber
        const [animeId, seasonNumber, episodeNumber] = pathParts;
        vercelReq.query = { 
          ...vercelReq.query, 
          animeId, 
          seasonNumber, 
          episodeNumber 
        };
        const { default: handler } = await import('../api/episode/[id].js');
        await handler(vercelReq, vercelRes).catch((error: any) => {
          console.error('Erreur handler episode with params:', error);
          throw error;
        });
      } else {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Format d\'URL invalide pour /api/episode' }));
      }
    }
    else if (pathname === '/api/embed/') {
      const { default: handler } = await import('../api/embed/[episodeId].js');
      await handler(vercelReq, vercelRes).catch((error: any) => {
        console.error('Erreur handler embed:', error);
        throw error;
      });
    }

    else if (pathname === '/api' || pathname === '/api/') {
      const { default: handler } = await import('../api/index.ts');
      await handler(vercelReq, vercelRes).catch(error => {
        console.error('Erreur handler index:', error);
        throw error;
      });
    }
    // Servir les fichiers statiques depuis le dossier public
    else if (pathname === '/' || pathname.startsWith('/public/') || pathname.endsWith('.html') || pathname.endsWith('.js') || pathname.endsWith('.css')) {
      let filePath;
      
      if (pathname === '/') {
        filePath = join(process.cwd(), 'public', 'index.html');
      } else if (pathname.startsWith('/public/')) {
        filePath = join(process.cwd(), pathname);
      } else {
        filePath = join(process.cwd(), 'public', pathname);
      }

      if (existsSync(filePath)) {
        try {
          const content = readFileSync(filePath);
          
          // Déterminer le type de contenu
          let contentType = 'text/plain';
          if (filePath.endsWith('.html')) {
            contentType = 'text/html; charset=utf-8';
          } else if (filePath.endsWith('.js')) {
            contentType = 'application/javascript; charset=utf-8';
          } else if (filePath.endsWith('.css')) {
            contentType = 'text/css; charset=utf-8';
          } else if (filePath.endsWith('.json')) {
            contentType = 'application/json; charset=utf-8';
          }
          
          res.setHeader('Content-Type', contentType);
          res.statusCode = 200;
          res.end(content);
        } catch (error) {
          console.error('Erreur lecture fichier:', error);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'text/plain');
          res.end('Erreur interne du serveur');
        }
      } else {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/html');
        res.end('<h1>404 - Page Not Found</h1>');
      }
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
  console.log(`🚀 API Anime Sama démarrée sur par shadow http://0.0.0.0:${PORT}`);
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
