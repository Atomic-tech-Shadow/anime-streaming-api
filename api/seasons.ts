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
  
  // Gestion spéciale pour les films (saison 999)
  if (seasonNumber === 999) {
    return await generateFilms(animeId, language);
  }
  
  // Calculer le nombre total d'épisodes en analysant toutes les saisons disponibles
  let totalEpisodes = await calculateTotalEpisodesFromAllSeasons(animeId, animeDetails);
  
  // Si totalEpisodes est encore 0, forcer un minimum
  if (totalEpisodes === 0) {
    totalEpisodes = 12; // Minimum par défaut
    console.log(`🔧 Forcing minimum 12 episodes for ${animeId}`);
  }

  // Configuration spéciale One Piece avec numérotation correcte
  if (animeId === 'one-piece') {
    const onePieceRanges = [
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
      { start: 1087, end: 1122 }  // Saga 11 (Egghead)
    ];
    
    if (seasonNumber > 0 && seasonNumber <= onePieceRanges.length) {
      const range = onePieceRanges[seasonNumber - 1];
      
      console.log(`✅ One Piece: Generating episodes ${range.start}-${range.end} for season ${seasonNumber}`);
      
      for (let episodeNum = range.start; episodeNum <= range.end; episodeNum++) {
        const episodeId = `${animeId}-episode-${episodeNum}-${language.toLowerCase()}`;
        
        episodes.push({
          id: episodeId,
          episodeNumber: episodeNum,
          title: `Episode ${episodeNum}`,
          language: language.toLowerCase(),
          seasonNumber,
          available: true,
          url: `https://anime-sama.fr/catalogue/${animeId}/saison${seasonNumber}/${language.toLowerCase()}/episode-${episodeNum}`,
          embedUrl: `/api/embed/${episodeId}`
        });
      }
      
      console.log(`📺 Generated ${episodes.length} episodes for One Piece season ${seasonNumber}`);
      return episodes;
    }
  }

  // Configuration spéciale My Hero Academia avec nombres d'épisodes réels
  if (animeId === 'my-hero-academia') {
    const mhaEpisodeCounts = [13, 25, 25, 25, 25, 25, 21]; // Saisons 1-7
    
    if (seasonNumber > 0 && seasonNumber <= mhaEpisodeCounts.length) {
      const episodeCount = mhaEpisodeCounts[seasonNumber - 1];
      
      console.log(`✅ My Hero Academia: Generating ${episodeCount} episodes for season ${seasonNumber}`);
      
      for (let episodeNum = 1; episodeNum <= episodeCount; episodeNum++) {
        const episodeId = `${animeId}-episode-${episodeNum}-${language.toLowerCase()}`;
        
        episodes.push({
          id: episodeId,
          episodeNumber: episodeNum,
          title: `Episode ${episodeNum}`,
          language: language.toLowerCase(),
          seasonNumber,
          available: true,
          url: `https://anime-sama.fr/catalogue/${animeId}/saison${seasonNumber}/${language.toLowerCase()}/episode-${episodeNum}`,
          embedUrl: `/api/embed/${episodeId}`
        });
      }
      
      console.log(`📺 Generated ${episodes.length} episodes for My Hero Academia season ${seasonNumber}`);
      return episodes;
    }
  }

  // Extraire les épisodes réels de cette saison spécifique depuis anime-sama.fr
  const seasonEpisodes = await extractRealSeasonEpisodes(animeId, seasonNumber, language, animeDetails);
  
  if (seasonEpisodes.length > 0) {
    console.log(`✅ Found ${seasonEpisodes.length} real episodes for ${animeId} season ${seasonNumber}`);
    return seasonEpisodes;
  }
  
  console.log(`❌ No episodes found for ${animeId} season ${seasonNumber}, trying fallback generation`);
  
  // Fallback: générer des épisodes basés sur la structure détectée
  const episodeRanges = getEpisodeRangesForAnime(animeId, totalEpisodes, animeDetails.seasons.length);
  
  if (seasonNumber > episodeRanges.length) {
    console.log(`❌ Season ${seasonNumber} exceeds available ranges (${episodeRanges.length})`);
    return [];
  }
  
  const seasonRange = episodeRanges[seasonNumber - 1];
  
  if (!seasonRange) {
    console.log(`❌ No range found for season ${seasonNumber}`);
    return [];
  }

  console.log(`✅ Generating episodes ${seasonRange.start}-${seasonRange.end} for ${animeId} season ${seasonNumber}`);

  // Générer les épisodes pour cette saison
  for (let episodeNum = seasonRange.start; episodeNum <= seasonRange.end; episodeNum++) {
    const episodeId = `${animeId}-episode-${episodeNum}-${language.toLowerCase()}`;
    
    episodes.push({
      id: episodeId,
      episodeNumber: episodeNum,
      title: `Episode ${episodeNum}`,
      language: language.toLowerCase(),
      seasonNumber,
      available: true,
      url: `https://anime-sama.fr/catalogue/${animeId}/saison${seasonNumber}/${language.toLowerCase()}/episode-${episodeNum}`,
      embedUrl: `/api/embed/${episodeId}`
    });
  }

  console.log(`📺 Generated ${episodes.length} episodes for ${animeId} season ${seasonNumber}`);
  return episodes;
}

function getEpisodeRangesForAnime(animeId: string, totalEpisodes: number, seasonCount: number): Array<{start: number, end: number}> {
  // Configurations spéciales pour animes avec structures connues
  const knownAnimeConfigs: Record<string, number[]> = {
    'my-hero-academia': [13, 25, 25, 25, 25, 25, 21], // Saisons 1-7
    'demon-slayer': [26, 11, 11, 8], // Saisons 1-4 
    'attack-on-titan': [25, 12, 22, 16], // Saisons 1-4
    'jujutsu-kaisen': [24, 24], // Saisons 1-2
    'chainsaw-man': [12], // Saison 1
  };
  
  if (knownAnimeConfigs[animeId]) {
    const episodeCounts = knownAnimeConfigs[animeId];
    const ranges = [];
    let currentStart = 1;
    
    for (const episodeCount of episodeCounts) {
      if (episodeCount > 0) {
        ranges.push({ start: currentStart, end: currentStart + episodeCount - 1 });
        currentStart += episodeCount;
      }
    }
    
    return ranges;
  }
  
  // Si nous avons le nombre de saisons, diviser équitablement
  if (seasonCount > 1 && totalEpisodes > 0) {
    const episodesPerSeason = Math.ceil(totalEpisodes / seasonCount);
    const ranges = [];
    
    for (let i = 0; i < seasonCount; i++) {
      const start = i * episodesPerSeason + 1;
      const end = Math.min((i + 1) * episodesPerSeason, totalEpisodes);
      
      if (start <= totalEpisodes) {
        ranges.push({ start, end });
      }
    }
    
    return ranges;
  }
  
  // Fallback pour séries courtes
  if (totalEpisodes <= 50) {
    return [{ start: 1, end: totalEpisodes }];
  }
  
  // Pour les séries longues, diviser intelligemment
  const commonSeasonLengths = [26, 25, 24, 13, 12];
  let bestSeasonLength = 25;
  
  for (const length of commonSeasonLengths) {
    if (totalEpisodes % length === 0 || Math.abs(totalEpisodes % length) < 5) {
      bestSeasonLength = length;
      break;
    }
  }
  
  const ranges = [];
  let currentStart = 1;
  
  while (currentStart <= totalEpisodes) {
    const end = Math.min(currentStart + bestSeasonLength - 1, totalEpisodes);
    ranges.push({ start: currentStart, end });
    currentStart = end + 1;
  }
  
  return ranges;
}

async function generateFilms(animeId: string, language: 'VF' | 'VOSTFR'): Promise<any[]> {
  const films: any[] = [];
  
  // Système universel de détection de films depuis anime-sama.fr
  try {
    const filmUrl = `https://anime-sama.fr/catalogue/${animeId}/film/${language.toLowerCase()}/`;
    console.log(`🎬 Checking for real films at: ${filmUrl}`);
    
    // Utiliser le navigator pour extraire les films réels disponibles
    const realFilms = await extractRealFilms(animeId, language);
    
    if (realFilms.length > 0) {
      console.log(`✅ Found ${realFilms.length} real films for ${animeId}`);
      return realFilms;
    }
    
    console.log(`📭 No films available for ${animeId}`);
    return [];
  } catch (error) {
    console.log(`⚠️ Error detecting films for ${animeId}:`, error);
    return [];
  }
}

/**
 * Système universel pour calculer le nombre total d'épisodes
 */
async function calculateTotalEpisodesFromAllSeasons(animeId: string, animeDetails: any): Promise<number> {
  // Configuration spéciale pour animes avec structures connues
  const knownAnimeConfigs: Record<string, number[]> = {
    'my-hero-academia': [13, 25, 25, 25, 25, 25, 21], // Saisons 1-7
    'demon-slayer': [26, 11, 11, 8], // Saisons 1-4 
    'attack-on-titan': [25, 12, 22, 16], // Saisons 1-4
    'jujutsu-kaisen': [24, 24], // Saisons 1-2
    'chainsaw-man': [12], // Saison 1
  };
  
  if (knownAnimeConfigs[animeId]) {
    const episodeCounts = knownAnimeConfigs[animeId];
    const totalEpisodes = episodeCounts.reduce((sum, count) => sum + count, 0);
    console.log(`📊 ${animeId}: ${totalEpisodes} total episodes across ${episodeCounts.length} seasons (known config)`);
    return totalEpisodes;
  }
  
  let totalEpisodes = 0;
  
  // Pour les autres animes, analyser chaque saison automatiquement
  if (animeDetails.seasons && animeDetails.seasons.length > 0) {
    for (const season of animeDetails.seasons) {
      if (season.number !== 999) { // Exclure les films
        const seasonEpisodeCount = await extractRealSeasonEpisodeCount(animeId, season.number, season);
        totalEpisodes += seasonEpisodeCount;
        console.log(`📊 Season ${season.number}: ${seasonEpisodeCount} episodes`);
      }
    }
  }
  
  // Si aucun épisode détecté, utiliser un système de fallback intelligent
  if (totalEpisodes === 0 && animeDetails.progressInfo?.totalEpisodes) {
    totalEpisodes = animeDetails.progressInfo.totalEpisodes;
    console.log(`📊 Using progressInfo fallback: ${totalEpisodes} episodes for ${animeId}`);
  }
  
  console.log(`📊 Total episodes calculated: ${totalEpisodes} for ${animeId}`);
  return totalEpisodes;
}

/**
 * Extrait les épisodes réels d'une saison spécifique
 */
async function extractRealSeasonEpisodes(animeId: string, seasonNumber: number, language: 'VF' | 'VOSTFR', animeDetails: any): Promise<any[]> {
  const episodes = [];
  
  try {
    const axios = (await import('axios')).default;
    
    // URLs possibles pour cette saison
    const urlsToTry = [
      `https://anime-sama.fr/catalogue/${animeId}/saison${seasonNumber}/${language.toLowerCase()}/episodes.js`,
      `https://anime-sama.fr/catalogue/${animeId}/saison-${seasonNumber}/${language.toLowerCase()}/episodes.js`,
    ];
    
    // Ajouter des URLs basées sur les noms de saisons détectés
    if (animeDetails.seasons) {
      const targetSeason = animeDetails.seasons.find(s => s.number === seasonNumber);
      if (targetSeason) {
        const seasonName = targetSeason.name.toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[()]/g, '')
          .replace(/-vostfr$/, '')
          .replace(/-vf$/, '');
        
        urlsToTry.push(
          `https://anime-sama.fr/catalogue/${animeId}/${seasonName}/${language.toLowerCase()}/episodes.js`
        );
      }
    }
    
    for (const url of urlsToTry) {
      try {
        console.log(`🔍 Extracting episodes from: ${url}`);
        const response = await axios.get(url, { 
          timeout: 8000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
        
        if (response.status === 200) {
          const episodesData = response.data;
          const epsMatches = episodesData.match(/var eps\d+\s*=\s*\[(.*?)\];/gs) || [];
          
          let episodeNumber = 1;
          
          for (const match of epsMatches) {
            const arrayContent = match.match(/\[(.*?)\]/s)?.[1] || '';
            const urlMatches = arrayContent.match(/'[^']*'/g) || [];
            const validUrls = urlMatches.filter(url => url.length > 10);
            
            for (let i = 0; i < validUrls.length; i++) {
              const episodeId = `${animeId}-episode-${episodeNumber}-${language.toLowerCase()}`;
              
              episodes.push({
                id: episodeId,
                episodeNumber: episodeNumber,
                title: `Episode ${episodeNumber}`,
                language: language.toLowerCase(),
                seasonNumber,
                available: true,
                url: `https://anime-sama.fr/catalogue/${animeId}/saison${seasonNumber}/${language.toLowerCase()}/episode-${episodeNumber}`,
                embedUrl: `/api/embed/${episodeId}`
              });
              
              episodeNumber++;
            }
          }
          
          if (episodes.length > 0) {
            console.log(`✅ Found ${episodes.length} episodes for ${animeId} season ${seasonNumber}`);
            return episodes;
          }
        }
      } catch (urlError) {
        // Continuer avec l'URL suivante
      }
    }
    
    return episodes;
  } catch (error) {
    console.log(`Error extracting real season episodes: ${error.message}`);
    return episodes;
  }
}

/**
 * Extrait le nombre d'épisodes d'une saison spécifique
 */
async function extractRealSeasonEpisodeCount(animeId: string, seasonNumber: number, seasonInfo: any): Promise<number> {
  try {
    const axios = (await import('axios')).default;
    let maxEpisodesFound = 0;
    
    // URLs pour cette saison spécifique
    const urlsToTry = [
      `https://anime-sama.fr/catalogue/${animeId}/saison${seasonNumber}/vostfr/episodes.js`,
      `https://anime-sama.fr/catalogue/${animeId}/saison-${seasonNumber}/vostfr/episodes.js`,
    ];
    
    // Ajouter l'URL basée sur le nom de la saison si disponible
    if (seasonInfo) {
      const seasonName = seasonInfo.name?.toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[()]/g, '')
        .replace(/-vostfr$/, '')
        .replace(/-vf$/, '');
      
      if (seasonName) {
        urlsToTry.push(`https://anime-sama.fr/catalogue/${animeId}/${seasonName}/vostfr/episodes.js`);
      }
    }
    
    for (const url of urlsToTry) {
      try {
        const response = await axios.get(url, { 
          timeout: 8000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        if (response.status === 200) {
          const episodesData = response.data;
          const epsMatches = episodesData.match(/var eps\d+\s*=\s*\[(.*?)\];/gs) || [];
          
          for (const match of epsMatches) {
            const arrayContent = match.match(/\[(.*?)\]/s)?.[1] || '';
            const urlMatches = arrayContent.match(/'[^']*'/g) || [];
            const validUrls = urlMatches.filter(url => url.length > 10);
            
            if (validUrls.length > maxEpisodesFound) {
              maxEpisodesFound = validUrls.length;
            }
          }
        }
      } catch (urlError) {
        // Continuer
      }
    }
    
    return maxEpisodesFound || 12; // Minimum par défaut
  } catch (error) {
    return 12;
  }
}

/**
 * Extrait les films réels disponibles depuis anime-sama.fr
 */
async function extractRealFilms(animeId: string, language: 'VF' | 'VOSTFR'): Promise<any[]> {
  const films: any[] = [];
  
  try {
    const axios = (await import('axios')).default;
    const filmUrl = `https://anime-sama.fr/catalogue/${animeId}/film/${language.toLowerCase()}/`;
    
    const response = await axios.get(filmUrl, { timeout: 10000 });
    
    if (response.status === 200) {
      const cheerio = (await import('cheerio')).default;
      const $ = cheerio.load(response.data);
      
      // Essayer de détecter les films depuis la page
      const filmElements = $('.film-item, .episode-item, [data-film]');
      
      filmElements.each((index: number, element: any) => {
        const filmTitle = $(element).find('.title, .film-title').text().trim() ||
                         $(element).text().trim() ||
                         `Film ${index + 1}`;
        
        const filmNumber = index + 1;
        const filmId = `${animeId}-film-${filmNumber}-${language.toLowerCase()}`;
        
        films.push({
          id: filmId,
          episodeNumber: filmNumber,
          title: filmTitle,
          language,
          seasonNumber: 999,
          available: true,
          type: 'film',
          year: new Date().getFullYear(),
          url: `${filmUrl}film-${filmNumber}`,
          embedUrl: `/api/embed/${filmId}`
        });
      });
      
      // Si aucun film détecté par les sélecteurs, essayer episodes.js
      if (films.length === 0) {
        const episodesJsUrl = `${filmUrl}episodes.js`;
        
        try {
          const jsResponse = await axios.get(episodesJsUrl, { timeout: 5000 });
          const episodesData = jsResponse.data;
          const eps1Match = episodesData.match(/var eps1\s*=\s*\[(.*?)\];/s);
          
          if (eps1Match) {
            const arrayContent = eps1Match[1];
            const urlMatches = arrayContent.match(/'[^']+'/g) || [];
            
            urlMatches.forEach((_, index) => {
              const filmNumber = index + 1;
              const filmId = `${animeId}-film-${filmNumber}-${language.toLowerCase()}`;
              
              films.push({
                id: filmId,
                episodeNumber: filmNumber,
                title: `${animeId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} Film ${filmNumber}`,
                language,
                seasonNumber: 999,
                available: true,
                type: 'film',
                year: new Date().getFullYear(),
                url: `${filmUrl}film-${filmNumber}`,
                embedUrl: `/api/embed/${filmId}`
              });
            });
          }
        } catch (jsError) {
          console.log(`No episodes.js found for films: ${jsError.message}`);
        }
      }
    }
    
    return films;
  } catch (error) {
    console.log(`Error extracting real films for ${animeId}:`, error.message);
    return [];
  }
}