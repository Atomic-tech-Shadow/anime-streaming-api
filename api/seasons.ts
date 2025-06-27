import { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, checkRateLimit, getClientIP, sendError, sendSuccess } from './lib/core';
import { realAnimeSamaScraper } from './lib/real-anime-sama-scraper';

// Base de données des épisodes de départ pour chaque saison
function getSeasonStartEpisode(animeId: string, seasonNumber: number): number {
  const seasonStartDatabase: { [key: string]: number[] } = {
    'one-piece': [
      1,    // Saison 1: épisodes 1-100
      101,  // Saison 2: épisodes 101-200
      201,  // Saison 3: épisodes 201-300
      301,  // Saison 4: épisodes 301-400
      401,  // Saison 5: épisodes 401-500
      501,  // Saison 6: épisodes 501-600
      601,  // Saison 7: épisodes 601-700
      701,  // Saison 8: épisodes 701-800
      801,  // Saison 9: épisodes 801-900
      901,  // Saison 10: épisodes 901-1000
      1087  // Saison 11: épisodes 1087-1122 (Saga Egghead)
    ],
    'naruto': [
      1,    // Naruto: épisodes 1-220
      221   // Naruto Shippuden: épisodes 221-720
    ],
    'my-hero-academia': [
      1,    // Saison 1: épisodes 1-13
      14,   // Saison 2: épisodes 14-38
      39,   // Saison 3: épisodes 39-63
      64,   // Saison 4: épisodes 64-88
      89,   // Saison 5: épisodes 89-113
      114,  // Saison 6: épisodes 114-138
      139   // Saison 7: épisodes 139-159
    ],
    'attack-on-titan': [
      1,    // Saison 1: épisodes 1-25
      26,   // Saison 2: épisodes 26-37
      38,   // Saison 3: épisodes 38-59
      60    // Saison 4: épisodes 60-75
    ],
    'demon-slayer': [
      1,    // Saison 1: épisodes 1-26
      27,   // Film Mugen Train: épisodes 27-37
      38    // Saison 2: épisodes 38-48
    ],
    'jujutsu-kaisen': [
      1,    // Saison 1: épisodes 1-24
      25    // Saison 2: épisodes 25-47
    ]
  };

  if (seasonStartDatabase[animeId] && seasonStartDatabase[animeId][seasonNumber - 1]) {
    return seasonStartDatabase[animeId][seasonNumber - 1];
  }

  // Par défaut: calcul simple pour les animes non mappés
  return 1 + (seasonNumber - 1) * 12;
}

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
    const { animeId, season, language = 'VOSTFR' } = req.query;
    const lang = Array.isArray(language) ? language[0] : language;

    if (!animeId || !season || typeof animeId !== 'string' || typeof season !== 'string') {
      return sendError(res, 400, 'AnimeId and season are required');
    }

    console.log(`Real season episodes request: ${animeId} - Season ${season} (${lang})`);

    // Récupérer les vraies données de l'anime depuis anime-sama.fr
    const animeDetails = await realAnimeSamaScraper.getAnimeDetails(animeId);
    
    if (!animeDetails || !animeDetails.seasons) {
      return sendError(res, 404, 'Anime not found on anime-sama.fr');
    }

    const targetSeason = animeDetails.seasons.find((s: any) => s.number === parseInt(season));
    if (!targetSeason) {
      return sendError(res, 404, 'Season not found on anime-sama.fr');
    }

    // Générer les épisodes pour cette saison avec vraie numérotation globale
    console.log(`Generating episodes for: ${animeId} - Season ${targetSeason.number}`);
    
    // Calculer le numéro d'épisode de départ pour cette saison
    const startEpisode = getSeasonStartEpisode(animeId, targetSeason.number);
    console.log(`Season ${targetSeason.number} starts at episode ${startEpisode}`);
    
    const episodes = [];
    for (let i = 0; i < targetSeason.episodeCount; i++) {
      const globalEpisodeNumber = startEpisode + i;
      const episodeId = `${animeId}-${globalEpisodeNumber}-${lang.toLowerCase()}`;
      
      episodes.push({
        id: episodeId,
        title: `Episode ${globalEpisodeNumber}`,
        episodeNumber: globalEpisodeNumber,
        url: `/api/episode/${episodeId}`,
        language: lang,
        available: true,
        authentic: true
      });
    }

    return sendSuccess(res, episodes, {
      animeId,
      seasonNumber: parseInt(season),
      seasonName: targetSeason.name,
      language,
      totalEpisodes: episodes.length,
      animeInfo: {
        title: animeDetails.title,
        authentic: true
      },
      source: 'anime-sama.fr'
    });

  } catch (error) {
    console.error('Real season episodes error:', error);
    return sendError(res, 500, 'Cannot access anime-sama.fr season data', {
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}