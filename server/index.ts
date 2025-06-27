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

    // Router pour les différentes endpoints avec gestion d'erreurs
    if (pathname === '/api/health') {
      const { default: handler } = await import('../api/health.ts');
      await handler(vercelReq, vercelRes).catch(error => {
        console.error('Erreur handler health:', error);
        throw error;
      });
    } 
    else if (pathname === '/api/status') {
      const { default: handler } = await import('../api/status.ts');
      await handler(vercelReq, vercelRes).catch(error => {
        console.error('Erreur handler status:', error);
        throw error;
      });
    }
    else if (pathname === '/api/search') {
      const { default: handler } = await import('../api/search.ts');
      await handler(vercelReq, vercelRes).catch(error => {
        console.error('Erreur handler search:', error);
        throw error;
      });
    }
    else if (pathname.startsWith('/api/anime/')) {
      const id = pathname.split('/')[3];
      vercelReq.query = { ...vercelReq.query, id };
      const { default: handler } = await import('../api/anime/[id].ts');
      await handler(vercelReq, vercelRes).catch(error => {
        console.error('Erreur handler anime:', error);
        throw error;
      });
    }
    else if (pathname.startsWith('/api/episode/')) {
      const id = pathname.split('/')[3];
      vercelReq.query = { ...vercelReq.query, id };
      const { default: handler } = await import('../api/episode/[id].ts');
      await handler(vercelReq, vercelRes).catch(error => {
        console.error('Erreur handler episode:', error);
        throw error;
      });
    }
    else if (pathname.startsWith('/api/embed/')) {
      const episodeId = pathname.split('/')[3];
      vercelReq.query = { ...vercelReq.query, episodeId };
      const { default: handler } = await import('../api/embed/[episodeId].ts');
      await handler(vercelReq, vercelRes).catch(error => {
        console.error('Erreur handler embed:', error);
        throw error;
      });
    }
    else if (pathname.startsWith('/api/proxy/')) {
      const url = pathname.split('/api/proxy/')[1];
      vercelReq.query = { ...vercelReq.query, url };
      const { default: handler } = await import('../api/proxy/[url].ts');
      await handler(vercelReq, vercelRes).catch(error => {
        console.error('Erreur handler proxy:', error);
        throw error;
      });
    }
    else if (pathname === '/api/trending') {
      const { default: handler } = await import('../api/trending.ts');
      await handler(vercelReq, vercelRes).catch(error => {
        console.error('Erreur handler trending:', error);
        throw error;
      });
    }
    else if (pathname === '/api/catalogue') {
      const { default: handler } = await import('../api/catalogue.ts');
      await handler(vercelReq, vercelRes).catch(error => {
        console.error('Erreur handler catalogue:', error);
        throw error;
      });
    }
    else if (pathname === '/api/genres') {
      const { default: handler } = await import('../api/genres.ts');
      await handler(vercelReq, vercelRes).catch(error => {
        console.error('Erreur handler genres:', error);
        throw error;
      });
    }
    else if (pathname === '/api/random') {
      const { default: handler } = await import('../api/random.ts');
      await handler(vercelReq, vercelRes).catch(error => {
        console.error('Erreur handler random:', error);
        throw error;
      });
    }
    else if (pathname === '/api/advanced-search') {
      const { default: handler } = await import('../api/advanced-search.ts');
      await handler(vercelReq, vercelRes).catch(error => {
        console.error('Erreur handler advanced-search:', error);
        throw error;
      });
    }
    else if (pathname === '/api/analyze-features') {
      const { default: handler } = await import('../api/analyze-features.ts');
      await handler(vercelReq, vercelRes).catch(error => {
        console.error('Erreur handler analyze-features:', error);
        throw error;
      });
    }
    else if (pathname === '/api/complete-scrape') {
      const { default: handler } = await import('../api/complete-scrape.ts');
      await handler(vercelReq, vercelRes).catch(error => {
        console.error('Erreur handler complete-scrape:', error);
        throw error;
      });
    }
    else if (pathname === '/api/scrape-status') {
      const { default: handler } = await import('../api/scrape-status.ts');
      await handler(vercelReq, vercelRes).catch(error => {
        console.error('Erreur handler scrape-status:', error);
        throw error;
      });
    }
    else if (pathname === '/api/seasons') {
      const { default: handler } = await import('../api/seasons.ts');
      await handler(vercelReq, vercelRes).catch(error => {
        console.error('Erreur handler seasons:', error);
        throw error;
      });
    }
    else if (pathname === '/api/content') {
      const { default: handler } = await import('../api/content.ts');
      await handler(vercelReq, vercelRes).catch(error => {
        console.error('Erreur handler content:', error);
        throw error;
      });
    }
    else if (pathname === '/api/content-types') {
      const { default: handler } = await import('../api/content-types.ts');
      await handler(vercelReq, vercelRes).catch(error => {
        console.error('Erreur handler content-types:', error);
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
  console.log(`🚀 API Anime Sama démarrée sur http://0.0.0.0:${PORT}`);
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