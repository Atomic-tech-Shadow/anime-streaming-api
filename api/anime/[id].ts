import { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, checkRateLimit, getClientIP, sendError, sendSuccess } from '../lib/core';
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
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return sendError(res, 400, 'Anime ID is required');
    }

    const animeId = id.trim();
    
    if (animeId.length === 0) {
      return sendError(res, 400, 'Valid anime ID is required');
    }

    console.log(`Anime details request: ${animeId}`);
    
    const animeDetails = await animeSamaNavigator.getAnimeDetails(animeId);
    
    if (!animeDetails) {
      return sendError(res, 404, 'Anime not found');
    }

    return sendSuccess(res, animeDetails, {
      animeId,
      source: 'anime-sama.fr'
    });

  } catch (error) {
    console.error('Anime details error:', error);
    return sendError(res, 500, 'Failed to fetch anime details', {
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}