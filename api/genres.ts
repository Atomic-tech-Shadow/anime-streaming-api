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
    const cacheKey = 'anime_genres';
    const cached = getFromCache(cacheKey);
    if (cached) {
      return sendSuccess(res, cached, { 
        cached: true,
        source: 'anime-sama.fr'
      });
    }

    console.log('🏷️ Fetching anime genres');
    
    const axiosInstance = createAxiosInstance();
    const response = await axiosInstance.get('/catalogue');
    const cleanHtml = cleanPageContent(response.data);
    const $ = cheerio.load(cleanHtml);
    
    const genres = new Set<string>();
    
    // Extract genres from various elements
    $('.genre, .tag, .category, .filter-genre option, .genre-list a, [data-genre]').each((i, element) => {
      const $el = $(element);
      const genreText = $el.text().trim();
      const genreValue = $el.attr('value') || $el.attr('data-genre');
      
      if (genreText && genreText.length > 1 && genreText.length < 30) {
        genres.add(genreText);
      }
      if (genreValue && genreValue.length > 1 && genreValue.length < 30) {
        genres.add(genreValue);
      }
    });

    // Add common anime genres if not found
    const commonGenres = [
      'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror', 
      'Romance', 'Sci-Fi', 'Thriller', 'Mystery', 'Slice of Life',
      'Supernatural', 'Sports', 'School', 'Military', 'Historical',
      'Mecha', 'Music', 'Psychological', 'Seinen', 'Shounen', 'Shoujo'
    ];

    commonGenres.forEach(genre => genres.add(genre));

    const genreList = Array.from(genres)
      .filter(genre => genre !== '' && !genre.includes('http'))
      .sort()
      .map((name, index) => ({
        id: index + 1,
        name,
        slug: name.toLowerCase().replace(/[^a-z0-9]/g, '-')
      }));

    setCache(cacheKey, genreList);
    
    return sendSuccess(res, genreList, {
      count: genreList.length,
      source: 'anime-sama.fr'
    });

  } catch (error) {
    console.error('Genres error:', error);
    return sendError(res, 500, 'Failed to fetch genres', {
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}