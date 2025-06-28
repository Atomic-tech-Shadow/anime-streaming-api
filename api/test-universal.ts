import { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, sendSuccess } from './lib/core';
import { smartAnimeDetector } from './lib/smart-anime-detector';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Tests automatiques avec différents animes
    const testAnimes = [
      'naruto',
      'one-piece', 
      'attack-on-titan',
      'demon-slayer',
      'my-hero-academia',
      'jujutsu-kaisen',
      'chainsaw-man',
      'tokyo-ghoul',
      'fullmetal-alchemist',
      'hunter-x-hunter'
    ];

    console.log(`🧪 Test universel en cours sur ${testAnimes.length} animes...`);
    
    const results = [];
    let successCount = 0;
    
    for (const animeName of testAnimes) {
      try {
        const match = await smartAnimeDetector.detectAnime(animeName);
        
        if (match) {
          results.push({
            input: animeName,
            detected: match.id,
            confidence: match.confidence,
            url: match.detectedUrl,
            success: true
          });
          successCount++;
        } else {
          results.push({
            input: animeName,
            detected: null,
            confidence: 0,
            url: null,
            success: false
          });
        }
      } catch (error) {
        results.push({
          input: animeName,
          error: error instanceof Error ? error.message : 'Unknown error',
          success: false
        });
      }
    }

    const summary = {
      totalTested: testAnimes.length,
      successfulDetections: successCount,
      failedDetections: testAnimes.length - successCount,
      successRate: `${Math.round((successCount / testAnimes.length) * 100)}%`
    };

    return sendSuccess(res, {
      summary,
      results,
      message: `Test universel terminé: ${successCount}/${testAnimes.length} animes détectés automatiquement`
    });

  } catch (error) {
    console.error('Erreur test universel:', error);
    return res.status(500).json({
      error: true,
      message: 'Erreur lors du test universel',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}