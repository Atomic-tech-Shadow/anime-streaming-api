import { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, checkRateLimit, getClientIP, sendError, sendSuccess } from './lib/core';

// Statistiques globales du scraping
let scrapeStats = {
  inProgress: false,
  startTime: null as Date | null,
  discoveredUrls: 0,
  processedUrls: 0,
  extractedItems: 0,
  currentPhase: 'idle',
  phases: {
    discovery: { completed: false, count: 0 },
    sitemap: { completed: false, count: 0 },
    pagination: { completed: false, count: 0 },
    categories: { completed: false, count: 0 },
    genres: { completed: false, count: 0 },
    extraction: { completed: false, count: 0 }
  },
  lastUpdate: new Date(),
  errors: [] as string[]
};

export function updateScrapeStats(phase: string, data: any) {
  scrapeStats.currentPhase = phase;
  scrapeStats.lastUpdate = new Date();
  
  switch (phase) {
    case 'start':
      scrapeStats.inProgress = true;
      scrapeStats.startTime = new Date();
      scrapeStats.discoveredUrls = 0;
      scrapeStats.processedUrls = 0;
      scrapeStats.extractedItems = 0;
      scrapeStats.errors = [];
      break;
      
    case 'discovery':
      scrapeStats.phases.discovery = { completed: true, count: data.count };
      scrapeStats.discoveredUrls = data.count;
      break;
      
    case 'sitemap':
      scrapeStats.phases.sitemap = { completed: true, count: data.count };
      scrapeStats.discoveredUrls = data.count;
      break;
      
    case 'pagination':
      scrapeStats.phases.pagination = { completed: true, count: data.count };
      scrapeStats.discoveredUrls = data.count;
      break;
      
    case 'categories':
      scrapeStats.phases.categories = { completed: true, count: data.count };
      scrapeStats.discoveredUrls = data.count;
      break;
      
    case 'genres':
      scrapeStats.phases.genres = { completed: true, count: data.count };
      scrapeStats.discoveredUrls = data.count;
      break;
      
    case 'extraction':
      scrapeStats.phases.extraction = { completed: false, count: data.processed };
      scrapeStats.processedUrls = data.processed;
      scrapeStats.extractedItems = data.extracted;
      break;
      
    case 'complete':
      scrapeStats.inProgress = false;
      scrapeStats.phases.extraction = { completed: true, count: data.extracted };
      scrapeStats.extractedItems = data.extracted;
      break;
      
    case 'error':
      scrapeStats.errors.push(data.error);
      break;
  }
}

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

  const elapsedTime = scrapeStats.startTime ? 
    Math.floor((Date.now() - scrapeStats.startTime.getTime()) / 1000) : 0;

  const estimatedTotal = scrapeStats.discoveredUrls;
  const progress = estimatedTotal > 0 ? 
    Math.round((scrapeStats.processedUrls / estimatedTotal) * 100) : 0;

  return sendSuccess(res, {
    scrapeInProgress: scrapeStats.inProgress,
    currentPhase: scrapeStats.currentPhase,
    elapsedTime,
    progress: {
      percentage: progress,
      discoveredUrls: scrapeStats.discoveredUrls,
      processedUrls: scrapeStats.processedUrls,
      extractedItems: scrapeStats.extractedItems
    },
    phases: scrapeStats.phases,
    errors: scrapeStats.errors,
    lastUpdate: scrapeStats.lastUpdate
  }, {
    statusType: 'scrape-progress',
    timestamp: new Date().toISOString()
  });
}