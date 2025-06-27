import { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, checkRateLimit, getClientIP, sendError, sendSuccess } from '../lib/core';
import { animeSamaNavigator } from '../lib/anime-sama-navigator';
import { videoSourceExtractor } from '../lib/video-source-extractor';

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
      return sendError(res, 400, 'Episode ID is required');
    }

    const episodeId = id.trim();
    
    if (episodeId.length === 0) {
      return sendError(res, 400, 'Valid episode ID is required');
    }

    console.log(`Real episode request: ${episodeId}`);
    
    const episodeData = await animeSamaNavigator.getEpisodeStreaming(episodeId);
    
    if (!episodeData) {
      return sendError(res, 404, 'Episode not found', { episodeId });
    }

    // Extraire les vraies sources vidéo lisibles pour chaque source
    const enhancedSources = [];
    for (const source of episodeData.sources) {
      if (source.url.includes('anime-sama.fr/streaming/')) {
        // Extraire les vraies sources vidéo depuis cette page
        const realSources = await videoSourceExtractor.extractRealVideoSources(source.url, source.language);
        enhancedSources.push(...realSources);
      } else {
        // Garder les sources déjà valides
        enhancedSources.push(source);
      }
    }

    // Mettre à jour les données avec les vraies sources vidéo
    const enhancedEpisodeData = {
      ...episodeData,
      sources: enhancedSources.length > 0 ? enhancedSources : episodeData.sources,
      availableServers: enhancedSources.length > 0 ? 
        Array.from(new Set(enhancedSources.map(s => s.server))) : 
        episodeData.availableServers
    };

    return sendSuccess(res, enhancedEpisodeData, {
      episodeId,
      source: 'anime-sama.fr',
      authentic: true,
      realVideoSources: enhancedSources.length > 0
    });

  } catch (error: any) {
    console.error(`Error getting episode streaming:`, error.message);
    
    if (error.message.includes('Invalid episode ID format')) {
      return sendError(res, 400, error.message, { episodeId: req.query.id });
    }
    
    return sendError(res, 500, 'Unable to retrieve episode streaming sources', { 
      error: error.message 
    });
  }
}