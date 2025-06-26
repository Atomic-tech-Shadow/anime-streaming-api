import { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, checkRateLimit, getClientIP, sendError, sendSuccess } from '../lib/core';
import { authenticCatalogueScraper } from '../lib/authentic-catalogue-scraper';
import { transformAnimeForFrontend } from '../lib/universal-helpers';

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
      return sendError(res, 400, 'Anime ID is required');
    }

    const animeId = id.trim();
    
    if (animeId.length === 0) {
      return sendError(res, 400, 'Valid anime ID is required');
    }

    console.log(`Authentic anime details request: ${animeId}`);
    
    const animeDetails = await authenticCatalogueScraper.getAuthenticAnimeDetails(animeId);
    
    if (!animeDetails) {
      return sendError(res, 404, `Anime '${animeId}' not found on anime-sama.fr`);
    }

    // Transformation universelle des données pour correspondre au frontend
    const frontendData = transformAnimeForFrontend(animeDetails);

    return sendSuccess(res, frontendData, {
      animeId,
      source: 'anime-sama.fr',
      authentic: true
    });

  } catch (error) {
    console.error('Real anime details error:', error);
    return sendError(res, 500, 'Cannot access anime-sama.fr data', {
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}