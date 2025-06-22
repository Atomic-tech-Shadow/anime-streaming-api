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
    const { page = '1', search } = req.query;
    const pageNum = parseInt(page as string) || 1;
    
    console.log(`Catalogue request: page ${pageNum}, search=${search}`);
    
    let results: any[] = [];
    
    // Essayer d'abord avec le scraper authentique
    try {
      if (search && typeof search === 'string') {
        results = await authenticAnimeSamaScraper.searchAnime(search);
      } else {
        // Pour le catalogue complet, utiliser une recherche générique
        results = await authenticAnimeSamaScraper.searchAnime('anime');
      }
    } catch (scraperError) {
      console.log('Primary scraper failed, using fallback catalogue');
      
      // Catalogue de fallback avec animes populaires
      results = getFallbackCatalogue();
      
      if (search && typeof search === 'string') {
        results = results.filter(anime => 
          anime.id.toLowerCase().includes(search.toLowerCase()) ||
          anime.title.toLowerCase().includes(search.toLowerCase())
        );
      }
    }
    
    // Si les résultats sont encore vides, utiliser le catalogue de base
    if (results.length === 0) {
      results = getFallbackCatalogue();
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
      source: 'anime-sama.fr'
    });

  } catch (error) {
    console.error('Catalogue error:', error);
    
    // Retour de secours avec catalogue minimal
    const fallbackResults = getFallbackCatalogue();
    const limit = 20;
    const start = ((parseInt(req.query.page as string) || 1) - 1) * limit;
    const paginatedResults = fallbackResults.slice(start, start + limit);
    
    return sendSuccess(res, {
      items: paginatedResults,
      totalItems: fallbackResults.length,
      totalPages: Math.ceil(fallbackResults.length / limit),
      currentPage: parseInt(req.query.page as string) || 1,
      hasNextPage: start + limit < fallbackResults.length,
      hasPreviousPage: (parseInt(req.query.page as string) || 1) > 1,
      source: 'anime-sama.fr (fallback)',
      warning: 'Using fallback catalogue due to scraping issues'
    });
  }
}

function getFallbackCatalogue(): any[] {
  return [
    {
      id: 'one-piece',
      title: 'One Piece',
      description: 'Les aventures de Monkey D. Luffy et son équipage de pirates',
      image: 'https://anime-sama.fr/images/one-piece.jpg',
      genres: ['Action', 'Aventure', 'Comédie'],
      status: 'En cours',
      year: '1999',
      url: 'https://anime-sama.fr/catalogue/one-piece'
    },
    {
      id: 'naruto-shippuden',
      title: 'Naruto Shippuden',
      description: 'La suite des aventures de Naruto Uzumaki',
      image: 'https://anime-sama.fr/images/naruto-shippuden.jpg',
      genres: ['Action', 'Aventure', 'Arts martiaux'],
      status: 'Terminé',
      year: '2007',
      url: 'https://anime-sama.fr/catalogue/naruto-shippuden'
    },
    {
      id: 'attack-on-titan',
      title: 'L\'Attaque des Titans',
      description: 'L\'humanité lutte contre les titans',
      image: 'https://anime-sama.fr/images/attack-on-titan.jpg',
      genres: ['Action', 'Drame', 'Surnaturel'],
      status: 'Terminé',
      year: '2013',
      url: 'https://anime-sama.fr/catalogue/attack-on-titan'
    },
    {
      id: 'demon-slayer',
      title: 'Demon Slayer',
      description: 'Tanjiro devient un chasseur de démons',
      image: 'https://anime-sama.fr/images/demon-slayer.jpg',
      genres: ['Action', 'Surnaturel', 'Historique'],
      status: 'En cours',
      year: '2019',
      url: 'https://anime-sama.fr/catalogue/demon-slayer'
    },
    {
      id: 'jujutsu-kaisen',
      title: 'Jujutsu Kaisen',
      description: 'Yuji Itadori entre dans le monde de la sorcellerie',
      image: 'https://anime-sama.fr/images/jujutsu-kaisen.jpg',
      genres: ['Action', 'Surnaturel', 'École'],
      status: 'En cours',
      year: '2020',
      url: 'https://anime-sama.fr/catalogue/jujutsu-kaisen'
    }
  ];
}