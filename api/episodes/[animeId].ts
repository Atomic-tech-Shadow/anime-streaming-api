import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Configuration CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { animeId, season, language } = req.query;

    if (!animeId) {
      return res.status(400).json({
        error: 'Paramètre animeId manquant',
        required: ['animeId'],
        optional: ['season', 'language']
      });
    }

    // Construction de l'URL avec paramètres optionnels
    let apiUrl = `https://api-anime-sama.onrender.com/api/episodes/${animeId}`;
    const params = new URLSearchParams();
    
    if (season) params.append('season', season as string);
    if (language) params.append('language', language as string);
    
    if (params.toString()) {
      apiUrl += `?${params.toString()}`;
    }
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Erreur API externe',
        status: response.status,
        message: `Impossible de récupérer les épisodes pour l'anime: ${animeId}`
      });
    }

    const data = await response.json();
    
    return res.status(200).json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
      source: 'api-anime-sama.onrender.com'
    });

  } catch (error: any) {
    console.error('Erreur endpoint /api/episodes/[animeId]:', error);
    return res.status(500).json({
      error: 'Erreur interne du serveur',
      message: error.message
    });
  }
}