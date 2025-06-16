import { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, checkRateLimit, getClientIP, sendError, sendSuccess } from './lib/core';
import { animeSamaNavigator } from './lib/anime-sama-navigator';

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
    const { query } = req.query;

    if (!query || typeof query !== 'string') {
      return sendError(res, 400, 'Query parameter is required');
    }

    if (query.trim().length < 2) {
      return sendError(res, 400, 'Query must be at least 2 characters long');
    }

    console.log(`Search request: ${query}`);
    
    const results = await animeSamaNavigator.searchAnime(query.trim());
    
    return sendSuccess(res, results, {
      query: query.trim(),
      resultsCount: results.length,
      source: 'anime-sama.fr'
    });

  } catch (error) {
    console.error('Search error:', error);
    return sendError(res, 500, 'Failed to search anime', {
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}