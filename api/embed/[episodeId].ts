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
    
    // Parse episode ID format: naruto-episode-1-vostfr
    const match = episodeId.match(/^(.+)-episode-(\d+)-(.+)$/);
    if (!match) {
      return sendError(res, 400, 'Invalid episode ID format');
    }
    
    const [, animeId, episodeNumber, language] = match;
    const episodeNum = parseInt(episodeNumber);
    
    // Récupérer les détails de l'anime
    const animeDetails = await realAnimeSamaScraper.getRealAnimeSeasons(animeId);
    if (!animeDetails || !animeDetails.seasons || animeDetails.seasons.length === 0) {
      return res.status(404).send(`
        <html>
          <body style="background: #1a1a2e; color: white; font-family: Arial; text-align: center; padding: 50px;">
            <h2>Anime non trouvé</h2>
            <p>L'anime "${animeId}" n'existe pas sur anime-sama.fr</p>
          </body>
        </html>
      `);
    }

    // Utiliser la première saison disponible
    const targetSeason = animeDetails.seasons[0];
    const realEpisodes = await realAnimeSamaScraper.getRealEpisodes(animeId, targetSeason.path);
    const episodeData = realEpisodes.find(ep => ep.episodeNumber === episodeNum);

    if (!episodeData) {
      return res.status(404).send(`
        <html>
          <body style="background: #1a1a2e; color: white; font-family: Arial; text-align: center; padding: 50px;">
            <h2>Episode non trouvé</h2>
            <p>L'épisode ${episodeNum} de "${animeDetails.title}" n'existe pas</p>
          </body>
        </html>
      `);
    }

    // Retourner une page embed avec l'iframe
    const embedHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Episode ${episodeNum} - ${animeDetails.title}</title>
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
            src="${episodeData.url}" 
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