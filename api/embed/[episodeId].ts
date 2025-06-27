import { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, checkRateLimit, getClientIP, sendError, setIframeCorsHeaders } from '../lib/core';
import { realAnimeSamaScraper } from '../lib/real-anime-sama-scraper';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setIframeCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return sendError(res, 405, 'Method not allowed');
  }

  const clientIP = getClientIP(req);
  if (!checkRateLimit(clientIP)) {
    return sendError(res, 429, 'Too many requests');
  }

  try {
    const { episodeId } = req.query;

    if (!episodeId || typeof episodeId !== 'string') {
      return sendError(res, 400, 'Episode ID is required');
    }

    console.log(`Embed request: ${episodeId}`);
    
    // Récupérer les détails de l'épisode via l'API episode
    const episodeData = await realAnimeSamaScraper.getEpisodeStreaming(episodeId);
    if (!episodeData || !episodeData.sources || episodeData.sources.length === 0) {
      return res.status(404).send(`
        <html>
          <body style="background: #1a1a2e; color: white; font-family: Arial; text-align: center; padding: 50px;">
            <h2>Episode non trouvé</h2>
            <p>L'épisode "${episodeId}" n'existe pas</p>
          </body>
        </html>
      `);
    }

    // Utiliser la première source disponible
    const firstSource = episodeData.sources[0];

    // Retourner une page embed avec l'iframe
    const embedHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${episodeData.title} - ${episodeData.animeTitle || 'Anime'}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { background: #000; overflow: hidden; }
            iframe { 
              width: 100vw; 
              height: 100vh; 
              border: none; 
              display: block;
            }
          </style>
        </head>
        <body>
          <iframe 
            src="${firstSource.url}" 
            allowfullscreen 
            webkitallowfullscreen 
            mozallowfullscreen
            allow="autoplay; fullscreen; encrypted-media"
            referrerpolicy="no-referrer-when-downgrade">
          </iframe>
        </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(embedHtml);

  } catch (error) {
    console.error('Embed error:', error);
    return res.status(500).send(`
      <html>
        <body style="background: #1a1a2e; color: white; font-family: Arial; text-align: center; padding: 50px;">
          <h2>Erreur serveur</h2>
          <p>Impossible de charger l'épisode</p>
        </body>
      </html>
    `);
  }
}