import { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, checkRateLimit, getClientIP, sendError, sendSuccess, createAxiosInstance, getFromCache, setCache, BASE_URL, cleanPageContent } from './lib/core';
import * as cheerio from 'cheerio';

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
    console.log('🎲 Fetching random anime');
    
    const axiosInstance = createAxiosInstance();
    const response = await axiosInstance.get('/catalogue');
    const cleanHtml = cleanPageContent(response.data);
    const $ = cheerio.load(cleanHtml);
    
    const animeList: any[] = [];
    
    // Extract all anime from catalogue
    $('a[href*="/catalogue/"]').each((i, element) => {
      const $el = $(element);
      const href = $el.attr('href');
      const title = $el.text().trim() || $el.attr('title') || '';
      const img = $el.find('img').first().attr('src');
      
      if (href && title && href.includes('/catalogue/')) {
        const animeId = href.split('/catalogue/')[1]?.split('/')[0];
        if (animeId && animeId !== '' && animeId.length > 1) {
          const exists = animeList.find(a => a.id === animeId);
          if (!exists) {
            animeList.push({
              id: animeId,
              title: title,
              url: href.startsWith('http') ? href : `${BASE_URL}${href}`,
              image: img ? (img.startsWith('http') ? img : `${BASE_URL}${img}`) : null,
              type: 'anime'
            });
          }
        }
      }
    });

    if (animeList.length === 0) {
      return sendError(res, 503, 'Unable to fetch random anime at this time');
    }

    // Select random anime
    const randomIndex = Math.floor(Math.random() * animeList.length);
    const randomAnime = animeList[randomIndex];
    
    return sendSuccess(res, randomAnime, {
      totalAvailable: animeList.length,
      source: 'anime-sama.fr'
    });

  } catch (error) {
    console.error('Random anime error:', error);
    return sendError(res, 500, 'Failed to fetch random anime', {
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}