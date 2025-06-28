import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Configuration CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Page d'accueil avec HTML intégré
  const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Anime Sama API - Deployed</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        
        .content {
            padding: 30px;
        }
        
        .status-section {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 30px;
        }
        
        .endpoints-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }
        
        .endpoint-card {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            border-left: 4px solid #007bff;
        }
        
        .test-button {
            background: #007bff;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            text-decoration: none;
            display: inline-block;
            margin-top: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎌 Anime Sama API</h1>
            <p>Déployé sur Vercel - Status: ✅ En ligne</p>
        </div>
        
        <div class="content">
            <div class="status-section">
                <h2>📊 API Status</h2>
                <p><strong>État:</strong> ✅ Déployée et opérationnelle</p>
                <p><strong>URL:</strong> https://streaming-anime-api.vercel.app</p>
                <p><strong>Endpoints disponibles:</strong> 8</p>
            </div>
            
            <h2>🚀 Endpoints API</h2>
            
            <div class="endpoints-grid">
                <div class="endpoint-card">
                    <h3>🔍 Recherche</h3>
                    <p>Rechercher des animes par nom</p>
                    <a href="/api/search?query=naruto" class="test-button" target="_blank">Tester</a>
                </div>
                
                <div class="endpoint-card">
                    <h3>📈 Trending</h3>
                    <p>Animes populaires du moment</p>
                    <a href="/api/trending" class="test-button" target="_blank">Tester</a>
                </div>
                
                <div class="endpoint-card">
                    <h3>📺 Détails Anime</h3>
                    <p>Informations complètes d'un anime</p>
                    <a href="/api/anime/chainsaw-man" class="test-button" target="_blank">Tester</a>
                </div>
                
                <div class="endpoint-card">
                    <h3>📋 Saisons</h3>
                    <p>Liste des saisons d'un anime</p>
                    <a href="/api/seasons/demon-slayer" class="test-button" target="_blank">Tester</a>
                </div>
                
                <div class="endpoint-card">
                    <h3>📖 Épisodes</h3>
                    <p>Épisodes par saison</p>
                    <a href="/api/episodes/one-piece?season=1&language=VOSTFR" class="test-button" target="_blank">Tester</a>
                </div>
                
                <div class="endpoint-card">
                    <h3>📅 Episodes Principal</h3>
                    <p>Endpoint principal pour épisodes</p>
                    <a href="/api/seasons?animeId=chainsaw-man&season=1&language=VOSTFR" class="test-button" target="_blank">Tester</a>
                </div>
                
                <div class="endpoint-card">
                    <h3>🎬 Sources Streaming</h3>
                    <p>Sources vidéo d'un épisode</p>
                    <a href="/api/episode/chainsaw-man-1-vostfr" class="test-button" target="_blank">Tester</a>
                </div>
                
                <div class="endpoint-card">
                    <h3>🎥 Lecteur Intégré</h3>
                    <p>Page d'intégration vidéo</p>
                    <a href="/api/embed/?url=https%3A//anime-sama.fr/catalogue/naruto/" class="test-button" target="_blank">Tester</a>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(htmlContent);
}