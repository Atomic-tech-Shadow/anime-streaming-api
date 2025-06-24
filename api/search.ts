import { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, checkRateLimit, getClientIP, sendError, sendSuccess } from './lib/core';

// Expanded anime database for reliable search
const ANIME_DATABASE = [
  { id: 'naruto', title: 'Naruto' },
  { id: 'one-piece', title: 'One Piece' },
  { id: 'dragon-ball-z', title: 'Dragon Ball Z' },
  { id: 'demon-slayer', title: 'Demon Slayer' },
  { id: 'attack-on-titan', title: 'Attack on Titan' },
  { id: 'jujutsu-kaisen', title: 'Jujutsu Kaisen' },
  { id: 'bleach', title: 'Bleach' },
  { id: 'my-hero-academia', title: 'My Hero Academia' },
  { id: 'hunter-x-hunter', title: 'Hunter x Hunter' },
  { id: 'fairy-tail', title: 'Fairy Tail' },
  { id: 'tokyo-ghoul', title: 'Tokyo Ghoul' },
  { id: 'death-note', title: 'Death Note' },
  { id: 'fullmetal-alchemist', title: 'Fullmetal Alchemist' },
  { id: 'mob-psycho-100', title: 'Mob Psycho 100' },
  { id: 'chainsaw-man', title: 'Chainsaw Man' },
  { id: 'spy-x-family', title: 'Spy x Family' },
  { id: 'solo-leveling', title: 'Solo Leveling' },
  { id: 'black-clover', title: 'Black Clover' },
  { id: 'dr-stone', title: 'Dr. Stone' },
  { id: 'vinland-saga', title: 'Vinland Saga' },
  { id: 'code-geass', title: 'Code Geass' },
  { id: 'overlord', title: 'Overlord' },
  { id: 'boruto', title: 'Boruto' },
  { id: 'pokemon', title: 'Pokémon' },
  { id: 'yu-gi-oh', title: 'Yu-Gi-Oh!' },
  { id: 'dragon-ball', title: 'Dragon Ball' },
  { id: 'dragon-ball-super', title: 'Dragon Ball Super' },
  { id: 'akame-ga-kill', title: 'Akame ga Kill!' },
  { id: 'sword-art-online', title: 'Sword Art Online' },
  { id: 'tokyo-revengers', title: 'Tokyo Revengers' }
];

function searchInAnimeDatabase(query: string): any[] {
  const queryLower = query.toLowerCase();
  const directId = queryLower.replace(/\s+/g, '-');
  
  return ANIME_DATABASE.filter(anime => {
    const titleLower = anime.title.toLowerCase();
    const animeWords = anime.id.split('-');
    const queryWords = directId.split('-');
    
    return (
      anime.id === directId ||
      anime.id.includes(directId) ||
      titleLower.includes(queryLower) ||
      queryLower.includes(titleLower) ||
      animeWords.some(word => queryWords.includes(word)) ||
      queryWords.some(word => animeWords.includes(word)) ||
      titleLower.replace(/[^a-z0-9]/g, '').includes(queryLower.replace(/[^a-z0-9]/g, ''))
    );
  }).map(anime => ({
    id: anime.id,
    title: anime.title,
    url: `https://anime-sama.fr/catalogue/${anime.id}/`,
    type: 'anime',
    status: 'Disponible',
    image: `https://cdn.statically.io/gh/Anime-Sama/IMG/img/contenu/${anime.id}.jpg`
  }));
}

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
    // Support both 'query' and 'q' parameters for compatibility
    const searchQuery = req.query.query || req.query.q;

    if (!searchQuery || typeof searchQuery !== 'string') {
      return sendError(res, 400, 'Query parameter (query or q) is required');
    }

    if (searchQuery.trim().length < 2) {
      return sendError(res, 400, 'Query must be at least 2 characters long');
    }

    console.log(`Search request: ${searchQuery}`);
    
    // Direct search from expanded anime database
    const searchResults = searchInAnimeDatabase(searchQuery.trim());
    
    return sendSuccess(res, searchResults, {
      query: searchQuery.trim(),
      resultsCount: searchResults.length,
      source: 'anime-sama.fr'
    });

  } catch (error) {
    console.error('Search error:', error);
    
    // Fallback: return trending animes if search fails
    try {
      console.log('Search failed, falling back to trending...');
      const trendingResults = await animeSamaNavigator.getTrendingAnime();
      
      return sendSuccess(res, trendingResults.slice(0, 10), {
        query: req.query.query || req.query.q,
        resultsCount: Math.min(trendingResults.length, 10),
        source: 'anime-sama.fr',
        fallback: 'trending',
        note: 'Search failed, showing trending animes'
      });
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
      return sendError(res, 500, 'Search service temporarily unavailable', {
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}