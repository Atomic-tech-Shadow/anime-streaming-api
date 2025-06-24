import { VercelRequest, VercelResponse } from '@vercel/node';
import { setIframeCorsHeaders, createAuthenticatedClient } from '../lib/core';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Configuration CORS renforcée pour proxy
  setIframeCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { url } = req.query;
    
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    // Décoder l'URL
    const targetUrl = decodeURIComponent(url);
    
    // Vérifier que c'est une URL valide
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    console.log(`🔗 Proxy request to: ${targetUrl}`);

    // Créer client authentifié
    const client = await createAuthenticatedClient();
    
    // Effectuer la requête proxy
    const response = await client.get(targetUrl, {
      timeout: 30000,
      headers: {
        'Referer': 'https://anime-sama.fr/',
        'Origin': 'https://anime-sama.fr',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });

    // Transférer les headers pertinents
    const contentType = response.headers['content-type'] || 'text/html';
    res.setHeader('Content-Type', contentType);
    
    // Headers spéciaux pour iframe
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    res.setHeader('Content-Security-Policy', 'frame-ancestors *');
    
    // Transférer le contenu
    res.status(200).send(response.data);

  } catch (error: any) {
    console.error('Proxy error:', error.message);
    
    if (error.code === 'ENOTFOUND') {
      return res.status(404).json({ 
        error: 'Target server not found',
        message: 'The streaming server is currently unavailable'
      });
    }
    
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({ 
        error: 'Connection refused',
        message: 'The streaming server refused the connection'
      });
    }
    
    return res.status(500).json({ 
      error: 'Proxy request failed',
      message: error.message
    });
  }
}