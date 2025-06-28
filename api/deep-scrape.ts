import type { VercelRequest, VercelResponse } from '@vercel/node';
import { animeSamaDeepScraper } from './lib/anime-sama-deep-scraper';

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
    console.log('🚀 Lancement du scraping profond d\'anime-sama.fr...');
    
    // Effectuer le scraping profond
    const results = await animeSamaDeepScraper.performDeepScraping();
    
    // Convertir les Maps et Sets en objets sérialisables
    const serializedResults = {
      animes: Array.from(results.animes.entries()).map(([id, anime]) => ({
        ...anime
      })),
      totalAnimes: results.totalAnimes,
      totalEpisodes: results.totalEpisodes,
      totalFilms: results.totalFilms,
      totalOAV: results.totalOAV,
      totalScans: results.totalScans,
      genres: Array.from(results.genres),
      years: Array.from(results.years),
      languages: Array.from(results.languages)
    };
    
    return res.status(200).json({
      success: true,
      message: 'Scraping profond terminé',
      data: serializedResults,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('❌ Erreur lors du scraping profond:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors du scraping profond',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}