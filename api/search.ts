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
    // Support both 'query' and 'q' parameters for compatibility
    const searchQuery = req.query.query || req.query.q;

    if (!searchQuery || typeof searchQuery !== 'string') {
      return sendError(res, 400, 'Query parameter (query or q) is required');
    }

    if (searchQuery.trim().length < 2) {
      return sendError(res, 400, 'Query must be at least 2 characters long');
    }

    console.log(`Search request: ${searchQuery}`);
    
    // Use direct authentic scraper for better results
    const { authenticAnimeSamaScraper } = await import('./lib/authentic-anime-sama-scraper');
    const results = await authenticAnimeSamaScraper.searchAnime(searchQuery.trim());
    
    return sendSuccess(res, results, {
      query: searchQuery.trim(),
      resultsCount: Array.isArray(results) ? results.length : 0,
      source: 'anime-sama.fr'
    });

  } catch (error) {
    console.error('Search error:', error);
    
    // Fallback: return trending animes if search fails
    try {
      console.log('Search failed, falling back to trending...');
      const trendingResults = await animeSamaNavigator.getTrendingAnime();
      
      return sendSuccess(res, trendingResults.slice(0, 10), {
        query: req.query.query || req.query.q,
        resultsCount: Math.min(trendingResults.length, 10),
        source: 'anime-sama.fr',
        fallback: 'trending',
        note: 'Search failed, showing trending animes'
      });
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
      return sendError(res, 500, 'Search service temporarily unavailable', {
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}