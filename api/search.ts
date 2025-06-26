import { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, checkRateLimit, getClientIP, sendError, sendSuccess, createAxiosInstance, cleanPageContent, BASE_URL } from './lib/core';
import { transformSearchResultForFrontend } from './lib/universal-helpers';
import * as cheerio from 'cheerio';
import { realAnimeSamaScraper } from './lib/real-anime-sama-scraper.js';

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

    // Utiliser le scraper authentique
    const results = await realAnimeSamaScraper.searchAnime(searchQuery);
    
    console.log(`✅ Found ${results.length} matching animes for "${searchQuery}"`);
    
    return sendSuccess(res, results, {
      query: searchQuery,
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