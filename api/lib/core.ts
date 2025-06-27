import axios, { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';

// Cache simple en mémoire pour Vercel
const cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

// Configuration depuis les variables d'environnement
export const CACHE_TTL = parseInt(process.env.CACHE_TTL || '300000'); // 5 minutes default
export const BASE_URL = process.env.BASE_URL || 'https://anime-sama.fr';
export const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || '100');
export const RATE_LIMIT_WINDOW = parseInt(process.env.RATE_LIMIT_WINDOW || '60000');
export const REQUEST_TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT || '20000');
export const MAX_RETRY_ATTEMPTS = parseInt(process.env.MAX_RETRY_ATTEMPTS || '3');
export const SESSION_SECRET = process.env.SESSION_SECRET || 'anime_sama_api_secret_key_2025_production_vercel_deployment';

// Validation for production deployment
if (process.env.NODE_ENV === 'production' && SESSION_SECRET === 'anime_sama_api_secret_key_2025_production_vercel_deployment') {
  console.warn('⚠️  Using default SESSION_SECRET in production. Please set a custom value for security.');
}
export const CACHE_ENABLED = process.env.CACHE_ENABLED !== 'false';
export const AD_BLOCKING_ENABLED = process.env.AD_BLOCKING_ENABLED !== 'false';
export const PASSIVE_AUTH_ENABLED = process.env.PASSIVE_AUTH_ENABLED !== 'false';
export const SESSION_ROTATION_INTERVAL = parseInt(process.env.SESSION_ROTATION_INTERVAL || '1800000');
export const MAX_REQUESTS_PER_SESSION = parseInt(process.env.MAX_REQUESTS_PER_SESSION || '50');

// User-Agent rotation with mobile and desktop variants
export const USER_AGENTS = (process.env.UA_LIST || 
  'Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36,' +
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36,' +
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36,' +
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1,' +
  'Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1'
).split(',');

// Ad filtering patterns for anime-sama.fr
export const AD_FILTERS = [
  'googletagmanager', 'google-analytics', 'doubleclick', 'googlesyndication',
  'facebook.com/tr', 'aclib.runBanner', 'popunder', 'popup', 'advertisement',
  'ads.yahoo', 'adsystem', 'amazon-adsystem', 'advertising', 'adskeeper',
  'propellerads', 'popcash', 'adnxs', 'adsrvr', 'outbrain', 'taboola'
];

// Cache functions
export function getFromCache(key: string) {
  const item = cache.get(key);
  if (item && Date.now() - item.timestamp < item.ttl) {
    return item.data;
  }
  cache.delete(key);
  return null;
}

export function setCache(key: string, data: any, ttl: number = CACHE_TTL) {
  cache.set(key, { data, timestamp: Date.now(), ttl });
}

export function clearCache() {
  cache.clear();
}

export function getCacheStats() {
  return {
    size: cache.size,
    keys: Array.from(cache.keys())
  };
}

// User-Agent rotation
export function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// Enhanced axios instance with passive authentication simulation
export function createAxiosInstance(sessionCookies?: string): AxiosInstance {
  const userAgent = getRandomUserAgent();
  
  const instance = axios.create({
    baseURL: BASE_URL,
    timeout: 30000,
    maxRedirects: 3,
    validateStatus: (status) => status < 500, // Accepter les redirections
    headers: {
      'User-Agent': userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Cache-Control': 'max-age=0',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Sec-CH-UA': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
      'Sec-CH-UA-Mobile': '?0',
      'Sec-CH-UA-Platform': '"Windows"'
    }
  });

  // Add session cookies if provided
  if (sessionCookies) {
    instance.defaults.headers['Cookie'] = sessionCookies;
  }

  // Request interceptor for ad blocking
  instance.interceptors.request.use((config) => {
    // Block requests to ad domains
    const url = config.url || '';
    const isAdRequest = AD_FILTERS.some(filter => url.includes(filter));
    
    if (isAdRequest) {
      console.log(`🚫 Blocked ad request: ${url}`);
      return Promise.reject(new Error('Ad request blocked'));
    }

    // Add referer for authenticity
    config.headers['Referer'] = BASE_URL + '/';
    
    return config;
  });

  return instance;
}

// Create authenticated client for proxy requests
export async function createAuthenticatedClient(): Promise<AxiosInstance> {
  const userAgent = getRandomUserAgent();
  
  const client = axios.create({
    timeout: 30000,
    maxRedirects: 5,
    headers: {
      'User-Agent': userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Sec-Fetch-Dest': 'iframe',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'cross-site'
    }
  });

  return client;
}

// Random delay for human-like behavior
export async function randomDelay(min: number = 500, max: number = 2000): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  await new Promise(resolve => setTimeout(resolve, delay));
}

// Clean page content from ads and scripts
export function cleanPageContent(html: string): string {
  let cleanHtml = html;

  // Remove ad-related scripts and elements
  const adPatterns = [
    /<script[^>]*(?:google|doubleclick|facebook|aclib|popunder)[^>]*>.*?<\/script>/gis,
    /<div[^>]*(?:advertisement|banner|popup)[^>]*>.*?<\/div>/gis,
    /<iframe[^>]*(?:doubleclick|googlesyndication)[^>]*>.*?<\/iframe>/gis,
    /aclib\.runBanner\([^)]*\);?/gi,
    /window\.open\([^)]*popup[^)]*\);?/gi
  ];

  adPatterns.forEach(pattern => {
    cleanHtml = cleanHtml.replace(pattern, '');
  });

  return cleanHtml;
}

// Server identification for streaming sources
export function identifyServer(url: string): string {
  if (url.includes('sibnet')) return 'Sibnet';
  if (url.includes('vidmoly')) return 'Vidmoly';
  if (url.includes('sendvid')) return 'SendVid';
  if (url.includes('mystream')) return 'MyStream';
  if (url.includes('evoload')) return 'Evoload';
  if (url.includes('streamtape')) return 'Streamtape';
  if (url.includes('doodstream')) return 'Doodstream';
  if (url.includes('upstream')) return 'UpStream';
  if (url.includes('mixdrop')) return 'Mixdrop';
  if (url.includes('.m3u8')) return 'HLS Stream';
  if (url.includes('.mp4')) return 'Direct MP4';
  if (url.includes('.mkv')) return 'Direct MKV';
  return 'Anime-Sama';
}

// Quality detection from URL patterns
export function detectQuality(url: string): string {
  if (url.includes('1080p') || url.includes('1080')) return '1080p';
  if (url.includes('720p') || url.includes('720')) return '720p';
  if (url.includes('480p') || url.includes('480')) return '480p';
  if (url.includes('360p') || url.includes('360')) return '360p';
  if (url.includes('4K') || url.includes('2160p')) return '4K';
  return 'Auto';
}

// Enhanced ad URL detection
export function isAdUrl(url: string): boolean {
  const urlLower = url.toLowerCase();
  return AD_FILTERS.some(filter => urlLower.includes(filter)) ||
         /\b(ad|ads|advertisement|banner|popup|sponsored|tracking|analytics)\b/.test(urlLower);
}

// Filter unique sources
export function filterUniqueSources(sources: any[]): any[] {
  const seen = new Set();
  return sources.filter(source => {
    const key = `${source.url}-${source.server}-${source.quality}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Rate limiting for Vercel
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(ip: string, maxRequests: number = RATE_LIMIT_MAX, windowMs: number = RATE_LIMIT_WINDOW): boolean {
  const now = Date.now();
  const userLimits = requestCounts.get(ip);

  if (!userLimits || now > userLimits.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (userLimits.count >= maxRequests) {
    return false;
  }

  userLimits.count++;
  return true;
}

// Extract client IP from Vercel request
export function getClientIP(req: any): string {
  return req.headers['x-forwarded-for']?.split(',')[0] ||
         req.headers['x-real-ip'] ||
         req.connection?.remoteAddress ||
         'unknown';
}

// CORS headers for Vercel with iframe support
export function setCorsHeaders(res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Content-Security-Policy', 'frame-ancestors *');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer-when-downgrade');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
}

// Enhanced CORS headers specifically for iframe embedding
export function setIframeCorsHeaders(res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Frame-Options');
  res.setHeader('X-Frame-Options', 'ALLOWALL');
  res.setHeader('Content-Security-Policy', 'frame-ancestors *; script-src *; style-src *; img-src *');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
}

// Error response helper
export function sendError(res: any, status: number, message: string, details?: any) {
  res.status(status).json({
    error: true,
    message,
    status,
    timestamp: new Date().toISOString(),
    ...(details && { details })
  });
}

// Success response helper
export function sendSuccess(res: any, data: any, meta?: any) {
  res.status(200).json({
    success: true,
    data,
    timestamp: new Date().toISOString(),
    ...(meta && { meta })
  });
}