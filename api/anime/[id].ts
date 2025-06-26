import { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, checkRateLimit, getClientIP, sendError, sendSuccess } from '../lib/core';
import { realAnimeSamaScraper } from '../lib/real-anime-sama-scraper.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

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
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return sendError(res, 400, 'Anime ID is required');
    }

    const animeId = id.trim();
    
    if (animeId.length === 0) {
      return sendError(res, 400, 'Valid anime ID is required');
    }

    console.log(`Authentic anime details request: ${animeId}`);
    
    const animeDetails = await realAnimeSamaScraper.getAnimeDetails(animeId);
    
    if (!animeDetails) {
      return sendError(res, 404, 'Anime not found', { animeId });
    }

    return sendSuccess(res, animeDetails, {
      animeId,
      source: 'anime-sama.fr',
      authentic: true
    });

  } catch (error: any) {
    console.error(`Error getting anime details: ${error.message}`);
    return sendError(res, 500, 'Unable to retrieve anime details', { 
      error: error.message 
    });
  }
}