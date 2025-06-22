import { VercelRequest, VercelResponse } from '@vercel/node';
import { sendError, sendSuccess, setCorsHeaders, createAxiosInstance } from '../lib/core';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Configuration CORS pour l'embed
  setCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return sendError(res, 405, 'Method not allowed');
  }

  try {
    const { episodeId } = req.query;
    
    if (!episodeId || typeof episodeId !== 'string') {
      return sendError(res, 400, 'Episode ID is required');
    }

    // Créer une page embed HTML avec iframe intégré
    const embedHtml = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lecteur Anime-Sama</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            background: #000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .embed-container {
            position: relative;
            width: 100%;
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        .embed-header {
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 10px 20px;
            display: flex;
            justify-content: between;
            align-items: center;
            border-bottom: 1px solid #333;
        }
        .embed-title {
            font-size: 16px;
            font-weight: 500;
        }
        .embed-controls {
            display: flex;
            gap: 10px;
        }
        .embed-btn {
            background: #1e40af;
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        }
        .embed-btn:hover {
            background: #3b82f6;
        }
        .video-container {
            flex: 1;
            position: relative;
            background: #000;
        }
        .video-iframe {
            width: 100%;
            height: 100%;
            border: none;
        }
        .loading {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: white;
            text-align: center;
        }
        .spinner {
            border: 2px solid #333;
            border-top: 2px solid #1e40af;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 10px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .error {
            color: #ef4444;
            text-align: center;
            padding: 20px;
        }
    </style>
</head>
<body>
    <div class="embed-container">
        <div class="embed-header">
            <div class="embed-title">Épisode ${episodeId}</div>
            <div class="embed-controls">
                <button class="embed-btn" onclick="openFullscreen()">Plein écran</button>
                <button class="embed-btn" onclick="openExternal()">Nouvel onglet</button>
            </div>
        </div>
        <div class="video-container">
            <div class="loading" id="loading">
                <div class="spinner"></div>
                <div>Chargement de la vidéo...</div>
            </div>
            <div class="error" id="error" style="display: none;">
                <div>❌ Erreur de chargement</div>
                <button class="embed-btn" onclick="retry()" style="margin-top: 10px;">Réessayer</button>
            </div>
            <iframe id="videoFrame" class="video-iframe" style="display: none;"></iframe>
        </div>
    </div>

    <script>
        let currentSources = [];
        let currentServerIndex = 0;
        
        async function loadEpisode() {
            const loading = document.getElementById('loading');
            const error = document.getElementById('error');
            const videoFrame = document.getElementById('videoFrame');
            
            loading.style.display = 'block';
            error.style.display = 'none';
            videoFrame.style.display = 'none';
            
            try {
                const response = await fetch(\`/api/episode/${episodeId}\`);
                const data = await response.json();
                
                if (data.success && data.data.sources && data.data.sources.length > 0) {
                    currentSources = data.data.sources;
                    loadVideoSource(0);
                } else {
                    throw new Error('Aucune source vidéo disponible');
                }
            } catch (err) {
                console.error('Erreur chargement épisode:', err);
                loading.style.display = 'none';
                error.style.display = 'block';
            }
        }
        
        function loadVideoSource(serverIndex) {
            const loading = document.getElementById('loading');
            const error = document.getElementById('error');
            const videoFrame = document.getElementById('videoFrame');
            
            if (!currentSources[serverIndex]) {
                loading.style.display = 'none';
                error.style.display = 'block';
                return;
            }
            
            currentServerIndex = serverIndex;
            const source = currentSources[serverIndex];
            
            videoFrame.onload = function() {
                loading.style.display = 'none';
                error.style.display = 'none';
                videoFrame.style.display = 'block';
            };
            
            videoFrame.onerror = function() {
                if (serverIndex + 1 < currentSources.length) {
                    loadVideoSource(serverIndex + 1);
                } else {
                    loading.style.display = 'none';
                    error.style.display = 'block';
                }
            };
            
            videoFrame.src = source.url;
        }
        
        function retry() {
            loadEpisode();
        }
        
        function openFullscreen() {
            const videoFrame = document.getElementById('videoFrame');
            if (videoFrame.requestFullscreen) {
                videoFrame.requestFullscreen();
            }
        }
        
        function openExternal() {
            if (currentSources[currentServerIndex]) {
                window.open(currentSources[currentServerIndex].url, '_blank');
            }
        }
        
        // Chargement initial
        loadEpisode();
    </script>
</body>
</html>`;

    // Retourner la page HTML
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    res.setHeader('Content-Security-Policy', "frame-ancestors *");
    
    return res.status(200).send(embedHtml);

  } catch (error) {
    console.error('Erreur embed:', error);
    return sendError(res, 500, 'Internal server error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}