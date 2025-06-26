import { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, checkRateLimit, getClientIP, sendError, sendSuccess } from '../lib/core';
import { realAnimeSamaScraper } from '../lib/real-anime-sama-scraper';

// Fonction pour extraire les genres basés sur le titre
function extractGenres(title: string): string[] {
  const genreMap: Record<string, string[]> = {
    'naruto': ['Action', 'Animation', 'Aventure', 'Shonen'],
    'one-piece': ['Action', 'Animation', 'Aventure', 'Shonen'],
    'dragon-ball': ['Action', 'Animation', 'Combat', 'Shonen'],
    'bleach': ['Action', 'Animation', 'Surnaturel', 'Shonen'],
    'attack-on-titan': ['Action', 'Animation', 'Drame', 'Shonen'],
    'demon-slayer': ['Action', 'Animation', 'Surnaturel', 'Shonen'],
    'my-hero-academia': ['Action', 'Animation', 'Super-héros', 'Shonen'],
    'jujutsu-kaisen': ['Action', 'Animation', 'Surnaturel', 'Shonen'],
    'chainsaw-man': ['Action', 'Animation', 'Horreur', 'Seinen'],
    'tokyo-ghoul': ['Action', 'Animation', 'Horreur', 'Seinen'],
    'death-note': ['Psychologique', 'Thriller', 'Surnaturel', 'Seinen'],
    'hunter-x-hunter': ['Action', 'Animation', 'Aventure', 'Shonen']
  };

  const lowerTitle = title.toLowerCase();
  for (const [key, genres] of Object.entries(genreMap)) {
    if (lowerTitle.includes(key)) {
      return genres;
    }
  }
  
  return ['Action', 'Animation', 'Aventure'];
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
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return sendError(res, 400, 'Anime ID is required');
    }

    const animeId = id.trim();
    
    if (animeId.length === 0) {
      return sendError(res, 400, 'Valid anime ID is required');
    }

    console.log(`Real anime details request: ${animeId}`);
    
    const animeDetails = await realAnimeSamaScraper.getRealAnimeSeasons(animeId);
    
    if (!animeDetails) {
      return sendError(res, 404, 'Anime not found on anime-sama.fr');
    }

    // Transformation des données pour correspondre au frontend
    const frontendData = {
      id: animeDetails.id,
      title: animeDetails.title,
      description: animeDetails.description || "Description non disponible",
      image: `https://via.placeholder.com/400x600/1a1a2e/ffffff?text=${encodeURIComponent(animeDetails.title)}`,
      genres: extractGenres(animeDetails.title) || ["Action", "Animation"],
      status: "En cours",
      year: "2024",
      seasons: animeDetails.seasons.map((season: any) => ({
        number: season.number,
        name: season.name,
        languages: ["VF", "VOSTFR"],
        episodeCount: season.episodeCount || 12,
        url: season.url
      })),
      url: animeDetails.url,
      authentic: true,
      extractedAt: new Date().toISOString()
    };

    return sendSuccess(res, frontendData, {
      animeId,
      source: 'anime-sama.fr',
      authentic: true
    });

  } catch (error) {
    console.error('Real anime details error:', error);
    return sendError(res, 500, 'Cannot access anime-sama.fr data', {
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}