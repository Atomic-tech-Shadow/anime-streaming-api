import { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, checkRateLimit, getClientIP, sendError, sendSuccess } from './lib/core';
import { realAnimeSamaScraper } from './lib/real-anime-sama-scraper';

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

    // Générer les épisodes pour cette saison
    console.log(`Generating episodes for: ${animeId} - Season ${targetSeason.number}`);
    
    const episodes = [];
    for (let i = 1; i <= targetSeason.episodeCount; i++) {
      const episodeId = `${animeId}-${i}-${lang.toLowerCase()}`;
      episodes.push({
        id: episodeId,
        title: `Episode ${i}`,
        episodeNumber: i,
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