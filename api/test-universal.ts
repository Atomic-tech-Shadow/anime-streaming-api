import { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, sendSuccess, sendError } from './lib/core';
import { universalAnimeAnalyzer } from './lib/universal-anime-analyzer';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { anime } = req.query;
    
    if (!anime || typeof anime !== 'string') {
      return sendError(res, 400, 'Anime ID required');
    }

    console.log(`🔍 Test analyse universelle: ${anime}`);
    
    const structure = await universalAnimeAnalyzer.analyzeAnimeStructure(anime);
    
    return sendSuccess(res, structure, {
      message: 'Analyse universelle terminée',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Erreur test universel:', error);
    return sendError(res, 500, 'Erreur analyse', { message: error.message });
  }
}