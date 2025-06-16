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
    const { 
      query, 
      genre, 
      status, 
      type, 
      year, 
      rating,
      sort = 'title',
      order = 'asc',
      page = '1'
    } = req.query;

    const pageNum = parseInt(page as string) || 1;
    const cacheKey = `advanced_search_${JSON.stringify(req.query)}`;
    const cached = getFromCache(cacheKey);
    if (cached) {
      return sendSuccess(res, cached, { 
        cached: true,
        source: 'anime-sama.fr'
      });
    }

    console.log('🔍 Advanced search request');
    
    const axiosInstance = createAxiosInstance();
    let searchUrl = '/catalogue';
    
    // Build search parameters
    const params = new URLSearchParams();
    if (query) params.append('search', query as string);
    if (genre) params.append('genre', genre as string);
    if (status) params.append('status', status as string);
    if (type) params.append('type', type as string);
    if (year) params.append('year', year as string);
    if (rating) params.append('rating', rating as string);
    if (pageNum > 1) params.append('page', pageNum.toString());
    
    if (params.toString()) {
      searchUrl += '?' + params.toString();
    }

    const response = await axiosInstance.get(searchUrl);
    const cleanHtml = cleanPageContent(response.data);
    const $ = cheerio.load(cleanHtml);
    
    const results: any[] = [];
    
    // Extract anime from search results
    $('a[href*="/catalogue/"], .anime-item, .search-result, .anime-card').each((i, element) => {
      const $el = $(element);
      const href = $el.attr('href') || $el.find('a').first().attr('href');
      const title = $el.text().trim() || $el.attr('title') || $el.find('.title, .name, h3, h4').first().text().trim();
      const img = $el.find('img').first().attr('src') || $el.find('img').first().attr('data-src');
      
      if (href && href.includes('/catalogue/') && title) {
        const animeId = href.split('/catalogue/')[1]?.split('/')[0];
        if (animeId && animeId !== '' && animeId.length > 1) {
          // Avoid duplicates
          const exists = results.find(r => r.id === animeId);
          if (!exists) {
            // Extract additional metadata
            const genreElements = $el.find('.genre, .tag, .category');
            const animeGenres = genreElements.map((i, el) => $(el).text().trim()).get();
            const statusElement = $el.find('.status, .state');
            const yearElement = $el.find('.year, .date');
            const ratingElement = $el.find('.rating, .score');
            
            const animeData = {
              id: animeId,
              title: title,
              url: href.startsWith('http') ? href : `${BASE_URL}${href}`,
              image: img ? (img.startsWith('http') ? img : `${BASE_URL}${img}`) : null,
              type: 'anime',
              genres: animeGenres.length > 0 ? animeGenres : [],
              status: statusElement.text().trim() || '',
              year: yearElement.text().trim() || '',
              rating: ratingElement.text().trim() || '',
              relevance: title.toLowerCase().includes((query as string || '').toLowerCase()) ? 1 : 0.5
            };

            // Apply filters
            let includeResult = true;
            
            if (query && !title.toLowerCase().includes((query as string).toLowerCase())) {
              animeData.relevance *= 0.5;
            }
            
            if (genre && !animeGenres.some(g => g.toLowerCase().includes((genre as string).toLowerCase()))) {
              includeResult = false;
            }
            
            if (status && !animeData.status.toLowerCase().includes((status as string).toLowerCase())) {
              includeResult = false;
            }
            
            if (year && !animeData.year.includes(year as string)) {
              includeResult = false;
            }

            if (includeResult) {
              results.push(animeData);
            }
          }
        }
      }
    });

    // Sort results
    const sortField = sort as string;
    const sortOrder = order as string;
    
    results.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'year':
          comparison = (parseInt(a.year) || 0) - (parseInt(b.year) || 0);
          break;
        case 'rating':
          comparison = (parseFloat(a.rating) || 0) - (parseFloat(b.rating) || 0);
          break;
        case 'relevance':
          comparison = b.relevance - a.relevance;
          break;
        default:
          comparison = a.title.localeCompare(b.title);
      }
      
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    const searchData = {
      results: results.slice(0, 50), // Limit to 50 results
      pagination: {
        currentPage: pageNum,
        hasNext: results.length > 50,
        hasPrev: pageNum > 1,
        totalResults: results.length
      },
      filters: {
        query: query as string || null,
        genre: genre as string || null,
        status: status as string || null,
        type: type as string || null,
        year: year as string || null,
        rating: rating as string || null
      },
      sorting: {
        field: sortField,
        order: sortOrder
      }
    };

    setCache(cacheKey, searchData);
    
    return sendSuccess(res, searchData, {
      count: searchData.results.length,
      page: pageNum,
      source: 'anime-sama.fr'
    });

  } catch (error) {
    console.error('Advanced search error:', error);
    return sendError(res, 500, 'Failed to perform advanced search', {
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}