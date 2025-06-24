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
    
    // Parse episode ID to extract anime and season info
    const episodeParts = episodeId.split('-');
    if (episodeParts.length < 3) {
      return sendError(res, 400, 'Invalid episode ID format. Expected: anime-season-episode');
    }
    
    const animeId = episodeParts[0];
    const seasonPath = episodeParts.slice(1, -1).join('-');
    const episodeNumber = parseInt(episodeParts[episodeParts.length - 1]);
    
    const realEpisodes = await realAnimeSamaScraper.getRealEpisodes(animeId, seasonPath);
    const episodeData = realEpisodes.find(ep => ep.episodeNumber === episodeNumber);

    if (!episodeData) {
      return sendError(res, 404, 'Episode not found on anime-sama.fr');
    }

    return sendSuccess(res, {
      id: episodeId,
      episodeNumber: episodeData.episodeNumber,
      url: episodeData.url,
      server: episodeData.server,
      alternativeServers: episodeData.alternativeServers || [],
      authentic: true,
      source: 'anime-sama.fr'
    });

  } catch (error) {
    console.error('Real episode error:', error);
    return sendError(res, 500, 'Cannot access anime-sama.fr episode data', {
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}