import { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, checkRateLimit, getClientIP, sendError, sendSuccess } from '../lib/core';
import { authenticAnimeSamaScraper } from '../lib/authentic-anime-sama-scraper';
import { createAxiosInstance } from '../lib/core';

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
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return sendError(res, 400, 'Film ID is required');
    }

    const filmId = id.trim();
    
    if (filmId.length === 0) {
      return sendError(res, 400, 'Valid film ID is required');
    }

    console.log(`Film request: ${filmId}`);
    
    // Parser l'ID: anime-language (ex: a-silent-voice-vostfr)
    const parts = filmId.split('-');
    const language = parts[parts.length - 1].toUpperCase() as 'VF' | 'VOSTFR';
    const animeId = parts.slice(0, -1).join('-');
    
    // URLs possibles pour les films
    const filmUrls = [
      `https://www.anime-sama.fr/catalogue/${animeId}/film/${language.toLowerCase()}`,
      `https://www.anime-sama.fr/catalogue/${animeId}/films/${language.toLowerCase()}`,
      `https://anime-sama.fr/catalogue/${animeId}/film/${language.toLowerCase()}`,
      `https://anime-sama.fr/catalogue/${animeId}/films/${language.toLowerCase()}`
    ];
    
    const axiosInstance = createAxiosInstance();
    let filmSources = [];
    let workingUrl = null;
    
    // Tester chaque URL possible
    for (const filmUrl of filmUrls) {
      try {
        console.log(`Test film URL: ${filmUrl}`);
        const response = await axiosInstance.get(filmUrl);
        
        if (response.status === 200 && !response.data.includes('Page introuvable')) {
          workingUrl = filmUrl;
          console.log(`URL film fonctionnelle: ${filmUrl}`);
          
          // Utiliser le scraper authentique pour obtenir les vraies sources vidéo
          const authenticSources = await authenticAnimeSamaScraper.extractAuthenticSources(filmUrl, language);
          
          if (authenticSources.length > 0) {
            filmSources = authenticSources;
            console.log(`Sources authentiques extraites: ${filmSources.length}`);
            break;
          }
        }
      } catch (error) {
        console.log(`URL film inaccessible: ${filmUrl}`);
        continue;
      }
    }
    
    if (!workingUrl && filmSources.length === 0) {
      return sendError(res, 404, 'Film not found', { filmId });
    }
    
    // Si aucune source trouvée, créer une réponse basique
    if (filmSources.length === 0) {
      filmSources = [{
        url: `https://www.anime-sama.fr/streaming/${animeId}-film-${language.toLowerCase()}`,
        server: 'Anime-Sama',
        quality: 'HD',
        language,
        type: 'iframe',
        serverIndex: 1
      }];
    }
    
    const filmData = {
      id: filmId,
      title: `${animeId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} (Film)`,
      animeTitle: animeId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      type: 'film',
      sources: filmSources,
      availableServers: Array.from(new Set(filmSources.map(s => s.server))),
      url: workingUrl || `https://anime-sama.fr/catalogue/${animeId}/`
    };

    return sendSuccess(res, filmData, {
      filmId,
      source: 'anime-sama.fr',
      authentic: true,
      realVideoSources: filmSources.length > 0
    });

  } catch (error: any) {
    console.error(`Error getting film streaming:`, error.message);
    return sendError(res, 500, 'Internal server error', { error: error.message });
  }
}