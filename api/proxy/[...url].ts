import { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, checkRateLimit, getClientIP, sendError, createAuthenticatedClient } from '../lib/core';
import axios from 'axios';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return sendError(res, 405, 'Method not allowed');
  }

  // Rate limiting
  const clientIP = getClientIP(req);
  if (!checkRateLimit(clientIP)) {
    return sendError(res, 429, 'Too many requests');
  }

  try {
    const { url } = req.query;
    
    if (!url || !Array.isArray(url)) {
      return sendError(res, 400, 'URL parameter is required');
    }

    const targetUrl = decodeURIComponent(url.join('/'));
    
    // Validate streaming URLs for security - allow known anime streaming servers
    const allowedDomains = [
      'anime-sama.fr',
      'streaming.anime-sama.fr',
      'video.sibnet.ru',
      'vidmoly.to',
      'vk.com',
      'sendvid.com',
      'vidoza.net',
      'streamtape.com',
      'doodstream.com',
      'mixdrop.co'
    ];
    
    const isAllowedDomain = allowedDomains.some(domain => targetUrl.includes(domain));
    if (!isAllowedDomain) {
      return sendError(res, 403, 'Domain not allowed for proxy');
    }

    console.log(`Proxying request to: ${targetUrl}`);

    const client = await createAuthenticatedClient();
    
    // Set headers to bypass iframe restrictions
    const response = await client.get(targetUrl, {
      headers: {
        'Referer': 'https://anime-sama.fr/',
        'Origin': 'https://anime-sama.fr',
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      timeout: 30000,
      maxRedirects: 5
    });

    // Set appropriate headers for the response
    res.setHeader('Content-Type', response.headers['content-type'] || 'text/html');
    res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes cache
    res.setHeader('X-Frame-Options', 'ALLOWALL'); // Allow iframe embedding
    res.setHeader('Content-Security-Policy', 'frame-ancestors *'); // Allow all origins
    
    // Remove problematic headers that might block embedding
    res.removeHeader('X-Frame-Options');

    return res.status(200).send(response.data);

  } catch (error) {
    console.error('Proxy error:', error);
    
    if (axios.isAxiosError(error)) {
      const status = error.response?.status || 500;
      const message = error.response?.statusText || 'Proxy request failed';
      return sendError(res, status, message, {
        originalError: error.message,
        targetUrl: req.query.url
      });
    }

    return sendError(res, 500, 'Internal proxy error', {
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}