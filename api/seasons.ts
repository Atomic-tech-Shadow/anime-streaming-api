import { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, checkRateLimit, getClientIP, sendError, sendSuccess } from './lib/core';
import { animeSamaNavigator } from './lib/anime-sama-navigator';

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
    const { animeId, season, language } = req.query;

    if (!animeId || typeof animeId !== 'string') {
      return sendError(res, 400, 'Anime ID is required');
    }

    if (!season || typeof season !== 'string') {
      return sendError(res, 400, 'Season number is required');
    }

    if (!language || typeof language !== 'string' || !['vf', 'vostfr'].includes(language.toLowerCase())) {
      return sendError(res, 400, 'Language must be VF or VOSTFR');
    }

    const cleanAnimeId = animeId.trim();
    const seasonNum = parseInt(season);
    const lang = language.toUpperCase() as 'VF' | 'VOSTFR';

    if (isNaN(seasonNum) || seasonNum < 1) {
      return sendError(res, 400, 'Season number must be a positive integer');
    }

    console.log(`Season episodes request: ${cleanAnimeId} - Season ${seasonNum} (${lang})`);
    
    const episodes = await animeSamaNavigator.getSeasonEpisodes(cleanAnimeId, seasonNum, lang);
    
    if (episodes.length === 0) {
      return sendError(res, 404, 'No episodes found for this season');
    }

    return sendSuccess(res, {
      animeId: cleanAnimeId,
      season: seasonNum,
      language: lang,
      episodes: episodes,
      episodeCount: episodes.length
    }, {
      animeId: cleanAnimeId,
      season: seasonNum,
      language: lang,
      episodeCount: episodes.length,
      source: 'anime-sama.fr'
    });

  } catch (error) {
    console.error('Season episodes error:', error);
    return sendError(res, 500, 'Failed to fetch season episodes', {
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}