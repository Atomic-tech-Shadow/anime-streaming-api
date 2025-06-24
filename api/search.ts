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
    const { q, query } = req.query;
    const searchQuery = (q || query) as string;

    if (!searchQuery || searchQuery.trim().length === 0) {
      return sendError(res, 400, 'Search query is required');
    }

    console.log(`Searching real anime-sama.fr data for: ${searchQuery}`);

    // Recherche UNIQUEMENT dans les données authentiques d'anime-sama.fr
    const results = await realAnimeSamaScraper.searchRealAnimes(searchQuery);

    return sendSuccess(res, {
      query: searchQuery,
      results: results,
      total: results.length,
      timestamp: new Date().toISOString(),
      source: 'anime-sama.fr',
      authentic: true
    });

  } catch (error) {
    console.error('Search error:', error);
    return sendError(res, 500, 'Cannot access anime-sama.fr data');
  }
}