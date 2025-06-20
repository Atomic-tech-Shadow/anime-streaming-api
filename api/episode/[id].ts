import { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, checkRateLimit, getClientIP, sendError, sendSuccess } from '../lib/core';
import { animeSamaNavigator } from '../lib/anime-sama-navigator';

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
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return sendError(res, 400, 'Episode ID is required');
    }

    const episodeId = id.trim();
    
    if (episodeId.length === 0) {
      return sendError(res, 400, 'Valid episode ID is required');
    }

    console.log(`Episode request: ${episodeId}`);
    
    const episodeData = await animeSamaNavigator.getEpisodeStreaming(episodeId);
    
    if (!episodeData || episodeData.sources.length === 0) {
      return sendError(res, 404, 'No streaming sources found for this episode', {
        note: 'This episode may not exist or may require authentication on anime-sama.fr'
      });
    }

    // Add proxy URLs to bypass CORS restrictions
    const enhancedSources = episodeData.sources.map(source => ({
      ...source,
      proxyUrl: `/api/proxy/${encodeURIComponent(source.url)}`,
      embedUrl: `/api/embed/${episodeId}`
    }));

    const enhancedEpisodeData = {
      ...episodeData,
      sources: enhancedSources,
      embedUrl: `/api/embed/${episodeId}`,
      corsInfo: {
        note: 'Original URLs may have CORS restrictions. Use proxyUrl or embedUrl for direct access.',
        proxyEndpoint: '/api/proxy/[url]',
        embedEndpoint: '/api/embed/[episodeId]'
      }
    };

    return sendSuccess(res, enhancedEpisodeData, {
      episodeId,
      episodeNumber: episodeData.episodeNumber,
      animeTitle: episodeData.animeTitle,
      sourcesCount: episodeData.sources.length,
      languages: [...new Set(episodeData.sources.map(s => s.language))],
      servers: episodeData.availableServers,
      serverIndices: [...new Set(episodeData.sources.map(s => s.serverIndex))],
      source: 'anime-sama.fr',
      method: 'authentic_structure_with_cors_bypass'
    });

  } catch (error) {
    console.error('Episode scraping error:', error);
    return sendError(res, 500, 'Failed to fetch episode streaming sources', {
      message: error instanceof Error ? error.message : 'Unknown error',
      note: 'Using authentic anime-sama.fr structure extraction'
    });
  }
}