import type { VercelRequest, VercelResponse } from '@vercel/node';
import { animeSamaFullAnalyzer } from './lib/anime-sama-full-analyzer';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Configuration CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🚀 Lancement de l\'analyse complète d\'anime-sama.fr...');
    
    // Effectuer l'analyse complète
    const analysis = await animeSamaFullAnalyzer.performCompleteAnalysis();
    
    return res.status(200).json({
      success: true,
      message: 'Analyse complète terminée',
      data: analysis,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('❌ Erreur lors de l\'analyse:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'analyse du site',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}