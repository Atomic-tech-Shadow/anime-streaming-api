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

    if (!animeId || !season || typeof animeId !== 'string' || typeof season !== 'string') {
      return sendError(res, 400, 'AnimeId and season are required');
    }

    console.log(`Real season episodes request: ${animeId} - Season ${season} (${language})`);

    // Récupérer les vraies données de la saison depuis anime-sama.fr
    const animeDetails = await realAnimeSamaScraper.getRealAnimeSeasons(animeId);
    
    if (!animeDetails || !animeDetails.seasons) {
      return sendError(res, 404, 'Anime not found on anime-sama.fr');
    }

    const targetSeason = animeDetails.seasons.find(s => s.number === parseInt(season));
    if (!targetSeason) {
      return sendError(res, 404, 'Season not found on anime-sama.fr');
    }

    // Extraire les vrais épisodes de cette saison
    console.log(`Extracting episodes from: ${animeId}/${targetSeason.path}`);
    const realEpisodes = await realAnimeSamaScraper.getRealEpisodes(animeId, targetSeason.path);
    
    const episodes = realEpisodes.map(ep => ({
      id: `${animeId}-${targetSeason.path.replace('/', '-')}-${ep.episodeNumber}`,
      episodeNumber: ep.episodeNumber,
      title: `Episode ${ep.episodeNumber}`,
      url: ep.url,
      server: ep.server,
      authentic: true
    }));

    return sendSuccess(res, {
      animeId,
      seasonNumber: parseInt(season),
      seasonName: targetSeason.name,
      language,
      episodes,
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