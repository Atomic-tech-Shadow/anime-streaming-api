import { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, sendSuccess } from './lib/core';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Main API documentation page
  const apiDocs = {
    name: "Anime-Sama Streaming API",
    version: "2.0.0",
    description: "REST API for scraping anime-sama.fr with passive authentication",
    endpoints: {
      search: {
        method: "GET",
        path: "/api/search",
        description: "Search anime by query",
        parameters: ["query (required)"],
        example: "/api/search?query=naruto"
      },
      animeDetails: {
        method: "GET", 
        path: "/api/anime/:id",
        description: "Get detailed anime information",
        parameters: ["id (required)"],
        example: "/api/anime/naruto"
      },
      episodeStream: {
        method: "GET",
        path: "/api/episode/:id", 
        description: "Get episode streaming sources with VF/VOSTFR support",
        parameters: ["id (required - format: animeId-episode-number-language)"],
        example: "/api/episode/naruto-episode-1-vostfr"
      },
      trending: {
        method: "GET",
        path: "/api/trending",
        description: "Get trending anime list",
        example: "/api/trending"
      },
      catalogue: {
        method: "GET",
        path: "/api/catalogue",
        description: "Browse anime catalogue with pagination and filters",
        parameters: ["page", "genre", "status", "type"],
        example: "/api/catalogue?page=1&genre=action"
      },
      genres: {
        method: "GET",
        path: "/api/genres", 
        description: "Get available anime genres",
        example: "/api/genres"
      },
      random: {
        method: "GET",
        path: "/api/random",
        description: "Get random anime for discovery", 
        example: "/api/random"
      },
      scan: {
        method: "GET",
        path: "/api/scan/:id",
        description: "Get manga/scan details with chapters",
        parameters: ["id (required)", "chapter (optional)"],
        example: "/api/scan/one-piece"
      },
      advancedSearch: {
        method: "GET", 
        path: "/api/search/advanced",
        description: "Advanced search with multiple filters",
        parameters: ["query", "genre", "status", "year", "sort", "order"],
        example: "/api/search/advanced?query=demon&genre=action&sort=year"
      },
      status: {
        method: "GET",
        path: "/api/status",
        description: "API status and cache information",
        example: "/api/status"
      },
      health: {
        method: "GET", 
        path: "/api/health",
        description: "Health check endpoint",
        example: "/api/health"
      },
      documentation: {
        method: "GET",
        path: "/docs",
        description: "Interactive Swagger API documentation",
        example: "/docs"
      }
    },
    features: {
      passiveAuthentication: "Simulates human behavior to bypass anti-bot protection",
      adBlocking: "Blocks 10+ advertising patterns and tracking scripts",
      rateLimiting: "100 requests per minute per IP address", 
      caching: "5-minute TTL in-memory cache for performance",
      multiLanguage: "Supports both VF (French) and VOSTFR (Japanese with French subtitles)",
      videoServers: ["Sibnet", "Vidmoly", "SendVid", "Dailymotion", "YouTube", "HLS Streams"]
    },
    deployment: {
      platform: "Vercel Serverless Functions",
      runtime: "Node.js 20",
      coldStartOptimized: true,
      memoryAllocated: "256MB - 1024MB per function",
      maxDuration: "10s - 60s per function"
    },
    environmentVariables: {
      SESSION_SECRET: "Required - Random string for session encryption",
      CACHE_TTL: "Optional - Cache duration in milliseconds (default: 300000)",
      UA_LIST: "Optional - Comma-separated User-Agent strings for rotation"
    },
    source: "anime-sama.fr",
    timestamp: new Date().toISOString()
  };

  return sendSuccess(res, apiDocs, {
    documentation: "/docs",
    status: "/api/status", 
    health: "/api/health"
  });
}