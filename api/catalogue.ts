import { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, checkRateLimit, getClientIP, sendError, sendSuccess } from './lib/core';
import { authenticAnimeSamaScraper } from './lib/authentic-anime-sama-scraper';

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
    const { page = '1' } = req.query;
    const pageNum = parseInt(page as string) || 1;
    
    console.log(`Catalogue request: page ${pageNum}`);
    
    // Utiliser la recherche anime pour obtenir le catalogue complet
    const results = await authenticAnimeSamaScraper.searchAnime('anime');
    
    // Pagination simple
    const limit = 20;
    const start = (pageNum - 1) * limit;
    const paginatedResults = results.slice(start, start + limit);

    return sendSuccess(res, {
      items: paginatedResults,
      totalItems: results.length,
      totalPages: Math.ceil(results.length / limit),
      currentPage: pageNum,
      hasNextPage: start + limit < results.length,
      hasPreviousPage: pageNum > 1,
      source: 'anime-sama.fr'
    });

  } catch (error) {
    console.error('Catalogue error:', error);
    return sendError(res, 500, 'Failed to fetch catalogue', {
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}