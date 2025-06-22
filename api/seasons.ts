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
    const { animeId, season, language = 'VOSTFR' } = req.query;

    if (!animeId || !season || typeof animeId !== 'string' || typeof season !== 'string') {
      return sendError(res, 400, 'AnimeId and season are required');
    }

    console.log(`Season episodes request: ${animeId} - Season ${season} (${language})`);

    // Récupérer les détails de l'anime pour obtenir la structure
    const animeDetails = await animeSamaNavigator.getAnimeDetails(animeId);
    
    if (!animeDetails) {
      return sendError(res, 404, 'Anime not found');
    }

    // Générer les épisodes pour cette saison
    const episodes = await generateSeasonEpisodes(animeId, parseInt(season), language as 'VF' | 'VOSTFR', animeDetails);

    return sendSuccess(res, {
      animeId,
      seasonNumber: parseInt(season),
      language,
      episodes,
      totalEpisodes: episodes.length,
      animeInfo: {
        title: animeDetails.title,
        totalEpisodes: animeDetails.progressInfo?.totalEpisodes || 0
      }
    });

  } catch (error) {
    console.error('Season episodes error:', error);
    return sendError(res, 500, 'Internal server error', {
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function generateSeasonEpisodes(
  animeId: string, 
  seasonNumber: number, 
  language: 'VF' | 'VOSTFR',
  animeDetails: any
): Promise<any[]> {
  const episodes = [];
  
  // Utiliser progressInfo pour déterminer le nombre total d'épisodes
  const totalEpisodes = animeDetails.progressInfo?.totalEpisodes || 0;
  
  if (totalEpisodes === 0) {
    return [];
  }
  
  // Calculer la plage d'épisodes pour cette saison
  const episodeRanges = getEpisodeRangesForAnime(animeId, totalEpisodes);
  
  if (seasonNumber > episodeRanges.length) {
    return [];
  }
  
  const seasonRange = episodeRanges[seasonNumber - 1];
  
  if (!seasonRange) {
    return [];
  }

  // Générer les épisodes pour cette saison
  for (let episodeNum = seasonRange.start; episodeNum <= seasonRange.end; episodeNum++) {
    const episodeId = `${animeId}-episode-${episodeNum}-${language.toLowerCase()}`;
    
    episodes.push({
      id: episodeId,
      episodeNumber: episodeNum,
      title: `Episode ${episodeNum}`,
      language,
      seasonNumber,
      available: true,
      url: `https://anime-sama.fr/catalogue/${animeId}/saison${seasonNumber}/${language.toLowerCase()}/episode-${episodeNum}`,
      embedUrl: `/api/embed/${episodeId}`
    });
  }

  return episodes;
}

function getEpisodeRangesForAnime(animeId: string, totalEpisodes: number): Array<{start: number, end: number}> {
  // Configuration spécifique pour One Piece basée sur la structure réelle
  if (animeId === 'one-piece') {
    return [
      { start: 1, end: 61 },      // Saga 1 (East Blue)
      { start: 62, end: 135 },    // Saga 2 (Alabasta)
      { start: 136, end: 206 },   // Saga 3 (Ile céleste)
      { start: 207, end: 325 },   // Saga 4 (Water Seven)
      { start: 326, end: 384 },   // Saga 5 (Thriller Bark)
      { start: 385, end: 516 },   // Saga 6 (Guerre au Sommet)
      { start: 517, end: 574 },   // Saga 7 (Ile des Hommes-Poissons)
      { start: 575, end: 746 },   // Saga 8 (Dressrosa)
      { start: 747, end: 889 },   // Saga 9 (Ile Tougato)
      { start: 890, end: 1086 },  // Saga 10 (Pays des Wa)
      { start: 1087, end: Math.min(totalEpisodes, 1200) }, // Saga 11 (Egghead)
    ];
  }
  
  // Configuration pour d'autres animes populaires
  if (animeId === 'naruto-shippuden') {
    return [
      { start: 1, end: 125 },     // Partie 1
      { start: 126, end: 250 },   // Partie 2
      { start: 251, end: 375 },   // Partie 3
      { start: 376, end: Math.min(totalEpisodes, 500) }, // Partie 4
    ];
  }
  
  if (animeId === 'demon-slayer') {
    return [
      { start: 1, end: 26 },      // Saison 1
      { start: 27, end: 44 },     // Saison 2
      { start: 45, end: Math.min(totalEpisodes, 70) }, // Saison 3
    ];
  }
  
  // Configuration générique pour d'autres animes
  const episodesPerSeason = Math.max(1, Math.ceil(totalEpisodes / Math.max(1, Math.ceil(totalEpisodes / 26))));
  const ranges = [];
  
  let currentStart = 1;
  while (currentStart <= totalEpisodes) {
    const end = Math.min(currentStart + episodesPerSeason - 1, totalEpisodes);
    ranges.push({ start: currentStart, end });
    currentStart = end + 1;
  }
  
  return ranges;
}