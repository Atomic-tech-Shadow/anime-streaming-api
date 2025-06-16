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
import { authenticAnimeSamaScraper } from './lib/authentic-anime-sama-scraper';

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

    console.log('📈 Fetching trending anime');
    
    const axiosInstance = createAxiosInstance();
    const response = await axiosInstance.get('/');
    const cleanHtml = cleanPageContent(response.data);
    const $ = cheerio.load(cleanHtml);
    
    const results: any[] = [];
    
    // Extract trending anime from homepage
    $('.anime-card, .anime-item, .card-anime, .trending-anime, .popular-anime, .featured-anime').each((i: number, element: any) => {
      const $el = $(element);
      const titleElement = $el.find('.anime-title, .title, h3, h4, .name').first();
      const linkElement = $el.find('a').first();
      const imageElement = $el.find('img').first();
      
      const title = titleElement.text().trim();
      const url = linkElement.attr('href');
      const image = imageElement.attr('src') || imageElement.attr('data-src');
      
      if (title && url && url.includes('/catalogue/')) {
        const animeId = url.split('/catalogue/')[1]?.split('/')[0];
        if (animeId && animeId !== '') {
          // Avoid duplicates
          const exists = results.find(r => r.id === animeId);
          if (!exists) {
            results.push({
              id: animeId,
              title,
              url: url.startsWith('http') ? url : `${BASE_URL}${url}`,
              image: image ? (image.startsWith('http') ? image : `${BASE_URL}${image}`) : null,
              type: 'anime',
              rank: results.length + 1
            });
          }
        }
      }
    });

    // If no trending found on homepage, extract from catalogue
    if (results.length === 0) {
      const catalogueResponse = await axiosInstance.get('/catalogue');
      const catalogueHtml = cleanPageContent(catalogueResponse.data);
      const $catalogue = cheerio.load(catalogueHtml);
      
      $catalogue('a[href*="/catalogue/"]').slice(0, 20).each((i: number, element: any) => {
        const $el = $catalogue(element);
        const href = $el.attr('href');
        const title = $el.text().trim() || $el.attr('title') || '';
        const img = $el.find('img').first().attr('src');
        
        if (href && title) {
          const animeId = href.split('/catalogue/')[1]?.split('/')[0];
          if (animeId && animeId !== '') {
            results.push({
              id: animeId,
              title: title,
              url: href.startsWith('http') ? href : `${BASE_URL}${href}`,
              image: img ? (img.startsWith('http') ? img : `${BASE_URL}${img}`) : null,
              type: 'anime',
              rank: i + 1
            });
          }
        }
      });
    }

    const trendingData = results.slice(0, 20);
    setCache(cacheKey, trendingData);
    
    return sendSuccess(res, trendingData, {
      count: trendingData.length,
      source: 'anime-sama.fr'
    });

  } catch (error) {
    console.error('Trending error:', error);
    return sendError(res, 500, 'Failed to fetch trending anime', {
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}