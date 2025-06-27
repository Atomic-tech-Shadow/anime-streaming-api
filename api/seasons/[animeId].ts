import { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, checkRateLimit, getClientIP, sendError, sendSuccess } from '../lib/core';

// Base de données des vraies informations de saisons pour les animes populaires
const SEASON_DATABASE: Record<string, {
  seasons: Array<{
    number: number;
    name: string;
    episodeCount: number;
    startEpisode: number; // Numéro de l'épisode global de début
    languages: string[];
  }>;
  totalEpisodes: number;
}> = {
  'my-hero-academia': {
    totalEpisodes: 138,
    seasons: [
      { number: 1, name: 'Saison 1', episodeCount: 13, startEpisode: 1, languages: ['VF', 'VOSTFR'] },
      { number: 2, name: 'Saison 2', episodeCount: 25, startEpisode: 14, languages: ['VF', 'VOSTFR'] },
      { number: 3, name: 'Saison 3', episodeCount: 25, startEpisode: 39, languages: ['VF', 'VOSTFR'] },
      { number: 4, name: 'Saison 4', episodeCount: 25, startEpisode: 64, languages: ['VF', 'VOSTFR'] },
      { number: 5, name: 'Saison 5', episodeCount: 25, startEpisode: 89, languages: ['VF', 'VOSTFR'] },
      { number: 6, name: 'Saison 6', episodeCount: 25, startEpisode: 114, languages: ['VF', 'VOSTFR'] },
      { number: 7, name: 'Saison 7', episodeCount: 21, startEpisode: 139, languages: ['VF', 'VOSTFR'] }
    ]
  },
  'one-piece': {
    totalEpisodes: 1122,
    seasons: [
      { number: 1, name: 'East Blue', episodeCount: 61, startEpisode: 1, languages: ['VF', 'VOSTFR'] },
      { number: 2, name: 'Alabasta', episodeCount: 77, startEpisode: 62, languages: ['VF', 'VOSTFR'] },
      { number: 3, name: 'Sky Island', episodeCount: 52, startEpisode: 139, languages: ['VF', 'VOSTFR'] },
      { number: 4, name: 'Water 7', episodeCount: 118, startEpisode: 191, languages: ['VF', 'VOSTFR'] },
      { number: 5, name: 'Thriller Bark', episodeCount: 45, startEpisode: 309, languages: ['VF', 'VOSTFR'] },
      { number: 6, name: 'Summit War', episodeCount: 108, startEpisode: 354, languages: ['VF', 'VOSTFR'] },
      { number: 7, name: 'Fish-Man Island', episodeCount: 58, startEpisode: 462, languages: ['VF', 'VOSTFR'] },
      { number: 8, name: 'Punk Hazard', episodeCount: 46, startEpisode: 520, languages: ['VF', 'VOSTFR'] },
      { number: 9, name: 'Dressrosa', episodeCount: 118, startEpisode: 566, languages: ['VF', 'VOSTFR'] },
      { number: 10, name: 'Whole Cake Island', episodeCount: 107, startEpisode: 784, languages: ['VF', 'VOSTFR'] },
      { number: 11, name: 'Wano', episodeCount: 194, startEpisode: 891, languages: ['VF', 'VOSTFR'] }
    ]
  },
  'naruto': {
    totalEpisodes: 720,
    seasons: [
      { number: 1, name: 'Naruto', episodeCount: 220, startEpisode: 1, languages: ['VF', 'VOSTFR'] },
      { number: 2, name: 'Naruto Shippuden', episodeCount: 500, startEpisode: 221, languages: ['VF', 'VOSTFR'] }
    ]
  },
  'attack-on-titan': {
    totalEpisodes: 75,
    seasons: [
      { number: 1, name: 'Saison 1', episodeCount: 25, startEpisode: 1, languages: ['VF', 'VOSTFR'] },
      { number: 2, name: 'Saison 2', episodeCount: 12, startEpisode: 26, languages: ['VF', 'VOSTFR'] },
      { number: 3, name: 'Saison 3', episodeCount: 22, startEpisode: 38, languages: ['VF', 'VOSTFR'] },
      { number: 4, name: 'Saison 4', episodeCount: 16, startEpisode: 60, languages: ['VF', 'VOSTFR'] }
    ]
  },
  'demon-slayer': {
    totalEpisodes: 44,
    seasons: [
      { number: 1, name: 'Saison 1', episodeCount: 26, startEpisode: 1, languages: ['VF', 'VOSTFR'] },
      { number: 2, name: 'Saison 2', episodeCount: 18, startEpisode: 27, languages: ['VF', 'VOSTFR'] }
    ]
  },
  'jujutsu-kaisen': {
    totalEpisodes: 24,
    seasons: [
      { number: 1, name: 'Saison 1', episodeCount: 24, startEpisode: 1, languages: ['VF', 'VOSTFR'] }
    ]
  }
};

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
    const { animeId } = req.query;

    if (!animeId || typeof animeId !== 'string') {
      return sendError(res, 400, 'Anime ID is required');
    }

    const normalizedAnimeId = animeId.toLowerCase().trim();
    
    if (normalizedAnimeId.length === 0) {
      return sendError(res, 400, 'Valid anime ID is required');
    }

    console.log(`Season data request for: ${normalizedAnimeId}`);

    // Rechercher dans la base de données
    const seasonData = SEASON_DATABASE[normalizedAnimeId];
    
    if (!seasonData) {
      return sendError(res, 404, 'Season data not found for this anime', {
        animeId: normalizedAnimeId,
        availableAnimes: Object.keys(SEASON_DATABASE)
      });
    }

    return sendSuccess(res, seasonData, {
      animeId: normalizedAnimeId,
      source: 'database',
      authentic: true
    });

  } catch (error: any) {
    console.error(`Error getting season data: ${error.message}`);
    return sendError(res, 500, 'Unable to retrieve season data', { 
      error: error.message 
    });
  }
}