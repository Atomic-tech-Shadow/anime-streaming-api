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
    const { season, language } = req.query;

    if (!animeId || typeof animeId !== 'string') {
      return sendError(res, 400, 'Anime ID is required');
    }

    if (!season || typeof season !== 'string') {
      return sendError(res, 400, 'Season number is required');
    }

    if (!language || typeof language !== 'string') {
      return sendError(res, 400, 'Language is required');
    }

    const normalizedAnimeId = animeId.toLowerCase().trim();
    const seasonNumber = parseInt(season);
    const lang = language.toLowerCase();
    
    if (isNaN(seasonNumber) || seasonNumber < 1) {
      return sendError(res, 400, 'Valid season number is required');
    }

    if (!['vf', 'vostfr'].includes(lang)) {
      return sendError(res, 400, 'Language must be VF or VOSTFR');
    }

    console.log(`Episodes request for: ${normalizedAnimeId}, season ${seasonNumber}, ${lang}`);

    // Rechercher dans la base de données
    const animeData = SEASON_DATABASE[normalizedAnimeId];
    
    if (!animeData) {
      return sendError(res, 404, 'Anime not found in database', {
        animeId: normalizedAnimeId,
        availableAnimes: Object.keys(SEASON_DATABASE)
      });
    }

    // Trouver la saison demandée
    const targetSeason = animeData.seasons.find(s => s.number === seasonNumber);
    
    if (!targetSeason) {
      return sendError(res, 404, 'Season not found', {
        animeId: normalizedAnimeId,
        requestedSeason: seasonNumber,
        availableSeasons: animeData.seasons.map(s => s.number)
      });
    }

    // Vérifier que la langue est supportée pour cette saison
    if (!targetSeason.languages.includes(lang.toUpperCase())) {
      return sendError(res, 404, 'Language not available for this season', {
        animeId: normalizedAnimeId,
        season: seasonNumber,
        requestedLanguage: lang,
        availableLanguages: targetSeason.languages
      });
    }

    // Générer la liste des épisodes avec les bons numéros globaux
    const episodes = [];
    for (let i = 1; i <= targetSeason.episodeCount; i++) {
      const globalEpisodeNumber = targetSeason.startEpisode + i - 1;
      const episodeId = `${normalizedAnimeId}-${globalEpisodeNumber}-${lang}`;
      
      episodes.push({
        id: episodeId,
        title: `Épisode ${i}`,
        episodeNumber: i, // Numéro dans la saison
        globalEpisodeNumber: globalEpisodeNumber, // Numéro global de l'épisode
        season: seasonNumber,
        language: lang,
        available: true,
        url: `/api/episode/${episodeId}`
      });
    }

    const result = {
      animeId: normalizedAnimeId,
      season: {
        number: seasonNumber,
        name: targetSeason.name,
        episodeCount: targetSeason.episodeCount,
        startEpisode: targetSeason.startEpisode
      },
      language: lang.toUpperCase(),
      episodes: episodes,
      totalEpisodes: episodes.length
    };

    return sendSuccess(res, result, {
      animeId: normalizedAnimeId,
      season: seasonNumber,
      language: lang,
      source: 'database',
      authentic: true
    });

  } catch (error: any) {
    console.error(`Error getting episodes: ${error.message}`);
    return sendError(res, 500, 'Unable to retrieve episodes', { 
      error: error.message 
    });
  }
}