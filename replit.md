# Anime-Sama API

## Overview

This is a Node.js REST API built with Express and TypeScript that scrapes anime-sama.fr to provide anime search, details, and streaming functionality. The application is designed for deployment on Vercel with serverless functions and includes intelligent caching, rate limiting, and passive authentication to interact with the anime-sama.fr website.

## System Architecture

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Runtime**: Node.js 20+ 
- **Deployment**: Vercel serverless functions
- **API Design**: RESTful endpoints following `/api/*` pattern
- **Request Handling**: Each endpoint is a separate serverless function

### Core Technologies
- **Web Scraping**: Cheerio for HTML parsing, Axios for HTTP requests
- **Authentication**: Passive authentication system that mimics browser behavior
- **Validation**: Zod for request/response validation
- **Session Management**: Cookie-based sessions with rotation

## Key Components

### 1. Scraping Engine
- **Core Library** (`api/lib/core.ts`): Central utilities for HTTP requests, caching, and content cleaning
- **Authentic Scraper** (`api/lib/authentic-anime-sama-scraper.ts`): Main scraping implementation
- **Navigator** (`api/lib/anime-sama-navigator.ts`): User behavior simulation for navigation
- **Human-like Scraper** (`api/lib/human-like-scraper.ts`): Advanced human behavior mimicking

### 2. API Endpoints
- `/api/search` - Anime search functionality
- `/api/anime/[id]` - Detailed anime information
- `/api/episode/[id]` - Episode streaming sources
- `/embed/[episode-id]` - Direct embed access for episodes
- `/api/trending` - Popular anime list
- `/api/catalogue` - Browse anime catalog
- `/api/genres` - Available anime genres
- `/api/random` - Random anime discovery
- `/api/scan/[id]` - Manga scan details
- `/api/advanced-search` - Advanced filtering
- `/api/health` & `/api/status` - System monitoring

### 3. Caching System
- **In-memory cache**: Simple Map-based caching for serverless environment
- **TTL Support**: Configurable time-to-live (default 5 minutes)
- **Cache key strategy**: Based on request parameters and endpoint
- **Cache statistics**: Available through status endpoint

### 4. Rate Limiting
- **IP-based limiting**: 100 requests per minute per IP (default)
- **Sliding window**: 60-second window tracking
- **Configurable limits**: Environment variable controlled

### 5. Authentication & Session Management
- **Passive authentication**: Mimics browser behavior without explicit login
- **Session rotation**: Automatic session refresh every 30 minutes
- **User-Agent rotation**: Multiple browser identities
- **Cookie handling**: Automatic cookie management for session persistence

## Data Flow

1. **Request Reception**: Vercel receives HTTP request and routes to appropriate serverless function
2. **Rate Limit Check**: IP-based rate limiting validation
3. **Cache Check**: Look for cached response before processing
4. **Request Processing**: 
   - Create authenticated HTTP client with rotating user agents
   - Perform web scraping with human-like delays
   - Parse HTML content with Cheerio
   - Extract and structure data
5. **Response Caching**: Store successful responses with TTL
6. **Response Delivery**: Return JSON response with metadata

## External Dependencies

### Primary Dependencies
- **@vercel/node**: Vercel serverless function runtime
- **axios**: HTTP client for web requests
- **cheerio**: Server-side HTML parsing and manipulation
- **express**: Web framework (for local development)
- **cors**: Cross-origin request handling
- **dotenv**: Environment variable management
- **tough-cookie**: Cookie jar implementation
- **user-agents**: User agent string generation
- **zod**: Runtime type validation

### Development Dependencies
- **typescript**: Type checking and compilation
- **tsx**: TypeScript execution for development
- **@types/node**: Node.js type definitions

## Deployment Strategy

### Vercel Configuration (Optimized)
- **Runtime**: Node.js 20.x
- **Memory allocation**: 256MB-1024MB per function (optimized per endpoint)
- **Timeout**: 10-60 seconds depending on endpoint complexity
- **Auto-scaling**: Vercel handles scaling automatically
- **Regions**: Europe (cdg1, fra1) + US East (iad1) for optimal performance
- **Cron jobs**: Health check every 10 minutes

### Environment Configuration
- **Multi-environment support**: Development, production configurations
- **Secret management**: Session secrets via Vercel environment variables
- **Feature flags**: Enable/disable caching, ad-blocking, passive auth
- **Performance tuning**: Enhanced rate limits (150 req/min), optimized timeouts
- **Security headers**: Complete security header set with XSS protection

### Build Process
1. TypeScript validation (tsc --noEmit)
2. Serverless function deployment
3. Environment variable injection
4. Automatic CDN distribution

### Monitoring & Reliability
- **Health checks**: `/api/health` and `/api/status` endpoints with cron monitoring
- **Error handling**: Comprehensive error responses with security headers
- **Logging**: Vercel function logs with performance metrics
- **Retry logic**: Automatic retry for failed requests
- **CI/CD**: GitHub Actions integration for validation and deployment

## Changelog

- June 15, 2025. Initial setup
- June 15, 2025. Configuration complète de déploiement Vercel optimisé avec headers de sécurité, régions multiples, CI/CD et monitoring automatique
- June 16, 2025. Migration complète vers Replit avec configuration de déploiement Render (render.yaml, Dockerfile, scripts de build)
- June 18, 2025. Migration successful from Replit Agent to standard Replit environment - all dependencies installed, server running on port 5000, API endpoints functional
- June 18, 2025. Fixed streaming source extraction bugs - improved episode ID parsing, added fallback mechanisms for anime-sama.fr connectivity issues
- June 19, 2025. Added /embed/ route support for direct episode URLs, enhanced URL parsing for better streaming source extraction
- June 19, 2025. Fixed TypeScript compilation errors for production builds by updating NavigatorEpisodeResponse interface

## User Preferences

Preferred communication style: Simple, everyday language.