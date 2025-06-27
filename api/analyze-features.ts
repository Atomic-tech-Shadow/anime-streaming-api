import { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, checkRateLimit, getClientIP, sendError, sendSuccess } from './lib/core';
import { animeSamaFeatureAnalyzer } from './lib/anime-sama-feature-analyzer';

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
    console.log('Starting complete feature analysis of anime-sama.fr...');
    
    const features = await animeSamaFeatureAnalyzer.analyzeCompleteFeatures();
    
    return sendSuccess(res, {
      analysis: features,
      summary: {
        totalContentTypes: features.contentTypes?.length || 0,
        totalLanguages: features.languages?.length || 0,
        totalSections: features.sections?.length || 0,
        totalUrlPatterns: features.urlPatterns?.length || 0,
        totalSpecialFeatures: features.specialFeatures?.length || 0
      }
    }, {
      analysisType: 'complete-feature-analysis',
      timestamp: new Date().toISOString(),
      source: 'anime-sama.fr'
    });

  } catch (error: any) {
    console.error('Feature analysis error:', error);
    return sendError(res, 500, 'Failed to analyze anime-sama.fr features');
  }
}