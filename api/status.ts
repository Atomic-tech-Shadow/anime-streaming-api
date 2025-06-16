import { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, sendSuccess, getCacheStats } from './lib/core';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const cacheStats = getCacheStats();
  
  const statusData = {
    status: 'operational',
    service: 'anime-sama-api',
    version: '2.0.0',
    deployment: 'vercel-serverless',
    timestamp: new Date().toISOString(),
    cache: {
      size: cacheStats.size,
      activeKeys: cacheStats.keys.length,
      sampleKeys: cacheStats.keys.slice(0, 5)
    },
    endpoints: {
      total: 12,
      available: [
        '/api/search',
        '/api/anime/:id',
        '/api/anime/:id/season/:num/episodes',
        '/api/episode/:id',
        '/api/trending',
        '/api/catalogue',
        '/api/genres',
        '/api/random',
        '/api/scan/:id',
        '/api/search/advanced',
        '/api/status',
        '/api/health'
      ]
    },
    features: {
      passiveAuthentication: true,
      adBlocking: true,
      rateLimiting: true,
      caching: true,
      multiLanguage: ['VF', 'VOSTFR'],
      videoServers: ['Sibnet', 'Vidmoly', 'SendVid', 'Dailymotion', 'YouTube']
    },
    source: 'anime-sama.fr'
  };

  return sendSuccess(res, statusData);
}