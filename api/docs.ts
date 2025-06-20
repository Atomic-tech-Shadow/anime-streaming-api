import { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders } from './lib/core';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Anime-Sama API Documentation</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
        h2 { color: #34495e; margin-top: 30px; }
        h3 { color: #7f8c8d; }
        .endpoint {
            background: #ecf0f1;
            padding: 15px;
            border-radius: 5px;
            margin: 10px 0;
            border-left: 4px solid #3498db;
        }
        .method {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 3px;
            font-weight: bold;
            font-size: 12px;
        }
        .get { background: #2ecc71; color: white; }
        .cors-warning {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 5px;
            padding: 15px;
            margin: 20px 0;
        }
        .cors-solution {
            background: #d1ecf1;
            border: 1px solid #b8daff;
            border-radius: 5px;
            padding: 15px;
            margin: 20px 0;
        }
        code {
            background: #f8f9fa;
            padding: 2px 5px;
            border-radius: 3px;
            font-family: 'Monaco', 'Menlo', monospace;
        }
        pre {
            background: #2c3e50;
            color: #ecf0f1;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
        }
        .example {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 5px;
            padding: 15px;
            margin: 10px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎌 Anime-Sama API Documentation</h1>
        
        <div class="cors-warning">
            <h3>⚠️ Important: Problème CORS Résolu</h3>
            <p>Les URLs vidéo d'anime-sama.fr ne peuvent pas être chargées directement dans des iframes depuis des domaines externes à cause des politiques CORS.</p>
            <p><strong>Problème:</strong> <code>X-Frame-Options: DENY</code> et <code>Content-Security-Policy: frame-ancestors 'self'</code></p>
        </div>

        <div class="cors-solution">
            <h3>✅ Solutions CORS Intégrées</h3>
            <p>Cette API fournit maintenant deux solutions automatiques pour contourner les restrictions CORS:</p>
            <ul>
                <li><strong>Proxy API:</strong> <code>/api/proxy/[url]</code> - Proxie les requêtes vers anime-sama.fr</li>
                <li><strong>Embed API:</strong> <code>/api/embed/[episodeId]</code> - Page d'embed complète prête à utiliser</li>
            </ul>
        </div>

        <h2>📋 Endpoints Principaux</h2>

        <div class="endpoint">
            <span class="method get">GET</span>
            <strong>/api/episode/[id]</strong>
            <p>Récupère les sources de streaming pour un épisode. Inclut maintenant des URLs proxy pour contourner CORS.</p>
            <div class="example">
                <strong>Exemple:</strong> <code>/api/episode/one-piece-1090-vostfr</code>
                <pre>{
  "success": true,
  "data": {
    "episodeId": "one-piece-1090-vostfr",
    "sources": [
      {
        "url": "https://anime-sama.fr/catalogue/one-piece/saison1/vostfr/episode-1090",
        "proxyUrl": "/api/proxy/https%3A%2F%2Fanime-sama.fr%2Fcatalogue%2Fone-piece%2Fsaison1%2Fvostfr%2Fepisode-1090",
        "embedUrl": "/api/embed/one-piece-1090-vostfr",
        "server": "Anime-Sama",
        "language": "VOSTFR",
        "type": "iframe"
      }
    ],
    "embedUrl": "/api/embed/one-piece-1090-vostfr",
    "corsInfo": {
      "note": "Original URLs may have CORS restrictions. Use proxyUrl or embedUrl for direct access."
    }
  }
}</pre>
            </div>
        </div>

        <div class="endpoint">
            <span class="method get">GET</span>
            <strong>/api/proxy/[...url]</strong>
            <p>Proxie les requêtes vers anime-sama.fr en contournant les restrictions CORS.</p>
            <div class="example">
                <strong>Exemple:</strong> <code>/api/proxy/https%3A%2F%2Fanime-sama.fr%2Fcatalogue%2Fone-piece%2Fsaison1%2Fvostfr%2Fepisode-1090</code>
                <p>Retourne le contenu HTML de la page d'épisode avec les headers CORS appropriés.</p>
            </div>
        </div>

        <div class="endpoint">
            <span class="method get">GET</span>
            <strong>/api/embed/[episodeId]</strong>
            <p>Page d'embed complète prête à utiliser dans une iframe.</p>
            <div class="example">
                <strong>Exemple:</strong> <code>/api/embed/one-piece-1090-vostfr</code>
                <p>Retourne une page HTML complète avec lecteur vidéo intégré et sélecteur de sources.</p>
                <pre>&lt;iframe src="/api/embed/one-piece-1090-vostfr" width="100%" height="500px"&gt;&lt;/iframe&gt;</pre>
            </div>
        </div>

        <h2>🔧 Instructions pour Votre IA</h2>
        
        <div class="cors-solution">
            <h3>Message à envoyer à votre IA:</h3>
            <pre>"J'ai un problème CORS avec mon API anime-sama. Les vidéos ne se chargent pas dans les iframes à cause de X-Frame-Options: DENY. 

Peux-tu m'aider à:
1. Créer un endpoint proxy /api/proxy/[url] qui contourne CORS
2. Ajouter les headers: X-Frame-Options: ALLOWALL et Content-Security-Policy: frame-ancestors *
3. Modifier l'endpoint /api/episode/[id] pour inclure des proxyUrl dans la réponse
4. Créer un endpoint /api/embed/[episodeId] qui retourne une page HTML prête à embed

L'objectif est de permettre l'embedding des vidéos anime-sama.fr depuis n'importe quel domaine."</pre>
        </div>

        <h2>🔧 Utilisation avec CORS</h2>

        <h3>Option 1: Utiliser l'embed (Recommandé)</h3>
        <pre>&lt;iframe 
  src="https://your-api-domain.replit.app/api/embed/one-piece-1090-vostfr" 
  width="100%" 
  height="500px"
  frameborder="0"
  allowfullscreen&gt;
&lt;/iframe&gt;</pre>

        <h3>Option 2: Utiliser le proxy</h3>
        <pre>// Récupérer les sources
const response = await fetch('/api/episode/one-piece-1090-vostfr');
const data = await response.json();

// Utiliser l'URL proxy au lieu de l'URL originale
const proxyUrl = data.data.sources[0].proxyUrl;

// Créer l'iframe avec l'URL proxy
const iframe = document.createElement('iframe');
iframe.src = proxyUrl;
iframe.width = '100%';
iframe.height = '500px';
document.body.appendChild(iframe);</pre>

        <h2>📊 Autres Endpoints</h2>
        
        <div class="endpoint">
            <span class="method get">GET</span>
            <strong>/api/search</strong> - Recherche d'animes par nom
        </div>
        
        <div class="endpoint">
            <span class="method get">GET</span>
            <strong>/api/anime/[id]</strong> - Détails complets d'un anime
        </div>
        
        <div class="endpoint">
            <span class="method get">GET</span>
            <strong>/api/trending</strong> - Liste des animes populaires
        </div>
        
        <div class="endpoint">
            <span class="method get">GET</span>
            <strong>/api/health</strong> - Statut de l'API
        </div>

        <h2>🚀 Statut</h2>
        <p><strong>Migration terminée:</strong> ✅ Replit Agent → Replit environment</p>
        <p><strong>CORS résolu:</strong> ✅ Proxy et embed endpoints fonctionnels</p>
        <p><strong>Documentation:</strong> ✅ Complète avec exemples</p>

        <hr>
        <p><em>Documentation mise à jour: Janvier 2025 - Migration Replit complète</em></p>
    </div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(html);
}