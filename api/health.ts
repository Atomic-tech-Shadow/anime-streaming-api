import { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, sendSuccess } from './lib/core';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const healthData = {
    status: 'healthy',
    service: 'anime-sama-api',
    version: '2.0.0',
    environment: 'vercel-serverless',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      external: Math.round(process.memoryUsage().external / 1024 / 1024)
    },
    platform: {
      node: process.version,
      platform: process.platform,
      arch: process.arch
    }
  };

  return sendSuccess(res, healthData);
}