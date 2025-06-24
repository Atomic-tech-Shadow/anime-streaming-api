import { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, checkRateLimit, getClientIP, sendError, sendSuccess } from './lib/core';
import { realAnimeSamaScraper } from './lib/real-anime-sama-scraper';

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
    const { page = '1', search } = req.query;
    const pageNum = parseInt(page as string) || 1;
    
    console.log(`Catalogue request: page ${pageNum}, search=${search}`);
    
    let results: any[] = [];
    
    // Extraire UNIQUEMENT les données authentiques d'anime-sama.fr
    try {
      if (search && typeof search === 'string') {
        results = await realAnimeSamaScraper.searchRealAnimes(search);
      } else {
        // Pour le catalogue complet, extraire la vraie liste
        results = await realAnimeSamaScraper.getReallCatalogueAnimes();
      }
    } catch (scraperError) {
      console.error('Cannot access anime-sama.fr:', scraperError);
      return sendError(res, 503, 'Cannot access anime-sama.fr data');
    }
    
    // Pagination
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
      source: 'anime-sama.fr',
      authentic: true
    });

  } catch (error) {
    console.error('Catalogue error:', error);
    return sendError(res, 500, 'Cannot access anime-sama.fr catalogue data');
  }
}