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
    const { animeId } = req.query;

    if (!animeId || typeof animeId !== 'string') {
      return sendError(res, 400, 'AnimeId is required');
    }

    console.log(`Content types request: ${animeId}`);

    // Récupérer les détails de l'anime
    const animeDetails = await animeSamaNavigator.getAnimeDetails(animeId);
    
    if (!animeDetails) {
      return sendError(res, 404, 'Anime not found');
    }

    // Analyser les types de contenu disponibles
    const contentTypes = await analyzeContentTypes(animeId, animeDetails);

    return sendSuccess(res, {
      animeId,
      animeTitle: animeDetails.title,
      availableContent: contentTypes,
      progressInfo: animeDetails.progressInfo
    });

  } catch (error) {
    console.error('Content types error:', error);
    return sendError(res, 500, 'Internal server error', {
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function analyzeContentTypes(animeId: string, animeDetails: any) {
  const contentTypes = [];
  
  // Analyser les saisons normales
  if (animeDetails.seasons && animeDetails.seasons.length > 0) {
    const regularSeasons = animeDetails.seasons.filter((s: any) => s.number !== 999);
    if (regularSeasons.length > 0) {
      contentTypes.push({
        type: 'episodes',
        name: 'Épisodes',
        count: animeDetails.progressInfo?.totalEpisodes || 0,
        seasons: regularSeasons.length,
        description: `${regularSeasons.length} saisons disponibles`,
        icon: '📺',
        available: true
      });
    }
  }

  // Analyser les films
  const filmsCount = getContentCount(animeId, 'films');
  if (filmsCount > 0) {
    contentTypes.push({
      type: 'films',
      name: 'Films',
      count: filmsCount,
      description: `${filmsCount} films disponibles`,
      icon: '🎬',
      available: true,
      endpoint: `/api/content?animeId=${animeId}&type=films`
    });
  }

  // Analyser les scans/manga
  const scansCount = getContentCount(animeId, 'scans');
  if (scansCount > 0 || animeDetails.progressInfo?.hasScans) {
    contentTypes.push({
      type: 'scans',
      name: 'Scans Manga',
      count: scansCount,
      description: `${scansCount > 0 ? scansCount + ' chapitres' : 'Chapitres'} disponibles`,
      icon: '📖',
      available: scansCount > 0,
      endpoint: `/api/content?animeId=${animeId}&type=scans`
    });
  }

  // Analyser les OAV
  const oavCount = getContentCount(animeId, 'oav');
  if (oavCount > 0) {
    contentTypes.push({
      type: 'oav',
      name: 'OAV/OVA',
      count: oavCount,
      description: `${oavCount} OAV disponibles`,
      icon: '🎭',
      available: true,
      endpoint: `/api/content?animeId=${animeId}&type=oav`
    });
  }

  // Analyser les spéciaux
  const specialsCount = getContentCount(animeId, 'specials');
  if (specialsCount > 0) {
    contentTypes.push({
      type: 'specials',
      name: 'Spéciaux',
      count: specialsCount,
      description: `${specialsCount} épisodes spéciaux`,
      icon: '⭐',
      available: true,
      endpoint: `/api/content?animeId=${animeId}&type=specials`
    });
  }

  return contentTypes;
}

function getContentCount(animeId: string, type: string): number {
  const databases: Record<string, any> = {
    films: getFilmsDatabase(),
    scans: getScansDatabase(), 
    oav: getOAVDatabase(),
    specials: getSpecialsDatabase()
  };

  const database = databases[type];
  if (!database || !database[animeId]) {
    return 0;
  }

  return database[animeId].length;
}

// Bases de données consolidées
function getFilmsDatabase(): Record<string, any[]> {
  return {
    'one-piece': Array(14).fill(null).map((_, i) => ({ id: i + 1 })),
    'naruto': Array(3).fill(null).map((_, i) => ({ id: i + 1 })),
    'naruto-shippuden': Array(8).fill(null).map((_, i) => ({ id: i + 1 })),
    'demon-slayer': Array(2).fill(null).map((_, i) => ({ id: i + 1 })),
    'dragon-ball-z': Array(13).fill(null).map((_, i) => ({ id: i + 1 })),
    'attack-on-titan': Array(3).fill(null).map((_, i) => ({ id: i + 1 })),
    'bleach': Array(4).fill(null).map((_, i) => ({ id: i + 1 })),
    'hunter-x-hunter': Array(2).fill(null).map((_, i) => ({ id: i + 1 })),
    'fullmetal-alchemist': Array(2).fill(null).map((_, i) => ({ id: i + 1 })),
    'death-note': Array(3).fill(null).map((_, i) => ({ id: i + 1 })),
    'mob-psycho-100': Array(1).fill(null).map((_, i) => ({ id: i + 1 })),
    'spirited-away': Array(1).fill(null).map((_, i) => ({ id: i + 1 })),
    'princess-mononoke': Array(1).fill(null).map((_, i) => ({ id: i + 1 })),
    'your-name': Array(1).fill(null).map((_, i) => ({ id: i + 1 }))
  };
}

function getScansDatabase(): Record<string, any[]> {
  return {
    'one-piece': Array(50).fill(null).map((_, i) => ({ id: i + 1 })), // 50 derniers chapitres
    'naruto': Array(30).fill(null).map((_, i) => ({ id: i + 1 })),
    'demon-slayer': Array(25).fill(null).map((_, i) => ({ id: i + 1 })),
    'attack-on-titan': Array(40).fill(null).map((_, i) => ({ id: i + 1 })),
    'bleach': Array(35).fill(null).map((_, i) => ({ id: i + 1 })),
    'hunter-x-hunter': Array(20).fill(null).map((_, i) => ({ id: i + 1 })),
    'fullmetal-alchemist': Array(30).fill(null).map((_, i) => ({ id: i + 1 })),
    'death-note': Array(12).fill(null).map((_, i) => ({ id: i + 1 })),
    'mob-psycho-100': Array(15).fill(null).map((_, i) => ({ id: i + 1 }))
  };
}

function getOAVDatabase(): Record<string, any[]> {
  return {
    'one-piece': Array(3).fill(null).map((_, i) => ({ id: i + 1 })),
    'naruto': Array(5).fill(null).map((_, i) => ({ id: i + 1 })),
    'dragon-ball-z': Array(4).fill(null).map((_, i) => ({ id: i + 1 })),
    'bleach': Array(2).fill(null).map((_, i) => ({ id: i + 1 })),
    'attack-on-titan': Array(8).fill(null).map((_, i) => ({ id: i + 1 }))
  };
}

function getSpecialsDatabase(): Record<string, any[]> {
  return {
    'one-piece': Array(10).fill(null).map((_, i) => ({ id: i + 1 })),
    'naruto': Array(6).fill(null).map((_, i) => ({ id: i + 1 })),
    'dragon-ball-z': Array(5).fill(null).map((_, i) => ({ id: i + 1 })),
    'demon-slayer': Array(3).fill(null).map((_, i) => ({ id: i + 1 }))
  };
}