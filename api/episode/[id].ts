import { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, checkRateLimit, getClientIP, sendError, sendSuccess } from '../lib/core';
import { realAnimeSamaScraper } from '../lib/real-anime-sama-scraper';

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
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return sendError(res, 400, 'Episode ID is required');
    }

    const episodeId = id.trim();
    
    if (episodeId.length === 0) {
      return sendError(res, 400, 'Valid episode ID is required');
    }

    console.log(`Real episode request: ${episodeId}`);
    
    // Parse episode ID format: naruto-episode-1-vostfr
    const match = episodeId.match(/^(.+)-episode-(\d+)-(.+)$/);
    if (!match) {
      return sendError(res, 400, 'Invalid episode ID format. Expected: anime-episode-number-language');
    }
    
    const [, animeId, episodeNumber, language] = match;
    const episodeNum = parseInt(episodeNumber);
    
    // Récupérer les détails de l'anime pour trouver la bonne saison
    const animeDetails = await realAnimeSamaScraper.getRealAnimeSeasons(animeId);
    if (!animeDetails || !animeDetails.seasons || animeDetails.seasons.length === 0) {
      return sendError(res, 404, 'Anime not found on anime-sama.fr');
    }

    // Utiliser la première saison disponible ou celle qui correspond
    const targetSeason = animeDetails.seasons[0];
    const realEpisodes = await realAnimeSamaScraper.getRealEpisodes(animeId, targetSeason.path);
    const episodeData = realEpisodes.find(ep => ep.episodeNumber === episodeNum);

    if (!episodeData) {
      return sendError(res, 404, 'Episode not found on anime-sama.fr');
    }

    // Format des données pour le frontend
    const episodeDetails = {
      id: episodeId,
      title: `Episode ${episodeNum}`,
      animeTitle: animeDetails.title,
      episodeNumber: episodeNum,
      sources: [
        {
          url: episodeData.url,
          server: episodeData.server || 'Server 1',
          quality: '720p',
          language: language.toUpperCase(),
          type: 'iframe',
          serverIndex: 1
        }
      ],
      availableServers: [episodeData.server || 'Server 1'],
      url: episodeData.url,
      authentic: true
    };

    return sendSuccess(res, episodeDetails, {
      animeId,
      episodeNumber: episodeNum,
      source: 'anime-sama.fr',
      authentic: true
    });

  } catch (error) {
    console.error('Real episode error:', error);
    return sendError(res, 500, 'Cannot access anime-sama.fr episode data', {
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}