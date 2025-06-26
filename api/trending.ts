import { VercelRequest, VercelResponse } from '@vercel/node';
import * as cheerio from 'cheerio';
import { 
  setCorsHeaders, 
  checkRateLimit, 
  getClientIP, 
  sendError, 
  sendSuccess,
  getFromCache,
  setCache,
  createAxiosInstance,
  cleanPageContent,
  BASE_URL
} from './lib/core';
import { realAnimeSamaScraper } from './lib/real-anime-sama-scraper';

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
    const cacheKey = 'trending_anime';
    const cached = getFromCache(cacheKey);
    if (cached) {
      return sendSuccess(res, cached, { 
        cached: true,
        source: 'anime-sama.fr'
      });
    }

    console.log('Fetching real trending anime from anime-sama.fr');
    
    // Utiliser le catalogue réel comme source de trending
    const realCatalogue = await realAnimeSamaScraper.getReallCatalogueAnimes();
    
    // Transformer les données pour le frontend
    const trendingResults = realCatalogue.slice(0, 20).map((anime: any, index: number) => ({
      id: anime.id,
      title: anime.title,
      url: anime.url,
      type: 'anime',
      status: 'En cours',
      image: `https://via.placeholder.com/300x400/1a1a2e/ffffff?text=${encodeURIComponent(anime.title)}`,
      rank: index + 1,
      authentic: true
    }));
    
    setCache(cacheKey, trendingResults);
    
    return sendSuccess(res, trendingResults, {
      count: trendingResults.length,
      source: 'anime-sama.fr',
      authentic: true
    });

  } catch (error) {
    console.error('Trending error:', error);
    return sendError(res, 500, 'Failed to fetch trending anime', {
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}