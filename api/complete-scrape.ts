import { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, checkRateLimit, getClientIP, sendError, sendSuccess } from './lib/core';
import { completeAnimeSamaScraper } from './lib/complete-anime-sama-scraper';

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
    console.log('Starting complete scrape of anime-sama.fr...');
    
    const completeData = await completeAnimeSamaScraper.scrapeCompleteContent();
    
    const summary = {
      totalItems: completeData.length,
      series: completeData.filter(item => item.type === 'series').length,
      films: completeData.filter(item => item.type === 'film').length,
      oav: completeData.filter(item => item.type === 'oav').length,
      scans: completeData.filter(item => item.type === 'scan').length,
      specials: completeData.filter(item => item.type === 'special').length,
      languages: {
        vf: completeData.filter(item => item.languages.includes('VF')).length,
        vostfr: completeData.filter(item => item.languages.includes('VOSTFR')).length,
        vj: completeData.filter(item => item.languages.includes('VJ')).length
      },
      withImages: completeData.filter(item => item.image).length,
      withDescriptions: completeData.filter(item => item.description).length
    };
    
    return sendSuccess(res, {
      scrapeResults: completeData,
      summary
    }, {
      scrapeType: 'complete-anime-sama-scrape',
      timestamp: new Date().toISOString(),
      source: 'anime-sama.fr'
    });

  } catch (error: any) {
    console.error('Complete scrape error:', error);
    return sendError(res, 500, 'Failed to complete scrape of anime-sama.fr');
  }
}