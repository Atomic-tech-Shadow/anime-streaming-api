import { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, checkRateLimit, getClientIP, sendError } from '../lib/core';
import { animeSamaNavigator } from '../lib/anime-sama-navigator';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return sendError(res, 405, 'Method not allowed');
  }

  // Rate limiting
  const clientIP = getClientIP(req);
  if (!checkRateLimit(clientIP)) {
    return sendError(res, 429, 'Too many requests');
  }

  try {
    const { episodeId } = req.query;

    if (!episodeId || typeof episodeId !== 'string') {
      return sendError(res, 400, 'Episode ID is required');
    }

    console.log(`Embed request for episode: ${episodeId}`);
    
    const episodeData = await animeSamaNavigator.getEpisodeStreaming(episodeId);
    
    if (!episodeData || episodeData.sources.length === 0) {
      return res.status(404).send(`
        <html>
          <head><title>Episode not found</title></head>
          <body>
            <h1>Episode not found</h1>
            <p>No streaming sources available for episode ${episodeId}</p>
          </body>
        </html>
      `);
    }

    // Get the first available source (preferably iframe type)
    const primarySource = episodeData.sources.find(s => s.type === 'iframe') || episodeData.sources[0];
    
    if (!primarySource) {
      return res.status(404).send(`
        <html>
          <head><title>No sources available</title></head>
          <body>
            <h1>No sources available</h1>
            <p>Unable to find streaming sources for episode ${episodeId}</p>
          </body>
        </html>
      `);
    }

    // Create embed HTML that uses our proxy
    const proxyUrl = `/api/proxy/${encodeURIComponent(primarySource.url)}`;
    
    const embedHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${episodeData.animeTitle} - Episode ${episodeData.episodeNumber}</title>
          <style>
            body {
              margin: 0;
              padding: 0;
              background: #000;
              font-family: Arial, sans-serif;
            }
            .container {
              width: 100%;
              height: 100vh;
              display: flex;
              flex-direction: column;
            }
            .video-container {
              flex: 1;
              position: relative;
              background: #000;
            }
            iframe {
              width: 100%;
              height: 100%;
              border: none;
            }
            .info {
              background: #1a1a1a;
              color: white;
              padding: 10px;
              text-align: center;
              font-size: 14px;
            }
            .sources {
              background: #2a2a2a;
              color: white;
              padding: 5px;
              text-align: center;
              font-size: 12px;
            }
            .source-btn {
              display: inline-block;
              margin: 2px;
              padding: 5px 10px;
              background: #4a4a4a;
              color: white;
              text-decoration: none;
              border-radius: 3px;
              font-size: 11px;
            }
            .source-btn:hover {
              background: #6a6a6a;
            }
            .source-btn.active {
              background: #007bff;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="info">
              ${episodeData.animeTitle} - Episode ${episodeData.episodeNumber}
              <br>Server: ${primarySource.server} (${primarySource.language})
            </div>
            <div class="video-container">
              <iframe src="${proxyUrl}" allowfullscreen></iframe>
            </div>
            <div class="sources">
              Available sources: 
              ${episodeData.sources.map((source, index) => {
                const sourceProxyUrl = `/api/proxy/${encodeURIComponent(source.url)}`;
                const isActive = source.url === primarySource.url;
                return `<a href="/api/embed/${episodeId}?source=${index}" class="source-btn ${isActive ? 'active' : ''}">${source.server} (${source.language})</a>`;
              }).join(' ')}
            </div>
          </div>
          <script>
            // Auto-refresh if iframe fails to load
            document.querySelector('iframe').onload = function() {
              console.log('Video loaded successfully');
            };
            
            document.querySelector('iframe').onerror = function() {
              console.log('Video failed to load, retrying...');
              setTimeout(() => {
                location.reload();
              }, 3000);
            };
          </script>
        </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    res.setHeader('Content-Security-Policy', 'frame-ancestors *');
    
    return res.status(200).send(embedHtml);

  } catch (error) {
    console.error('Embed error:', error);
    return res.status(500).send(`
      <html>
        <head><title>Error</title></head>
        <body>
          <h1>Error loading episode</h1>
          <p>${error instanceof Error ? error.message : 'Unknown error'}</p>
        </body>
      </html>
    `);
  }
}