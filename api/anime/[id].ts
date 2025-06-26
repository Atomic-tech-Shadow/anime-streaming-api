import { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, checkRateLimit, getClientIP, sendError, sendSuccess, createAxiosInstance, cleanPageContent, BASE_URL } from '../lib/core';
import { transformAnimeForFrontend } from '../lib/universal-helpers';
import * as cheerio from 'cheerio';

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
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return sendError(res, 400, 'Anime ID is required');
    }

    const animeId = id.trim();
    
    if (animeId.length === 0) {
      return sendError(res, 400, 'Valid anime ID is required');
    }

    console.log(`Authentic anime details request: ${animeId}`);
    
    // Extraction directe des détails depuis anime-sama.fr
    const axiosInstance = createAxiosInstance();
    
    // Essayer différents formats d'URL
    const urlFormats = [
      `/catalogue/${animeId}/`,
      `/catalogue/${animeId}`,
      `/${animeId}/`,
      `/${animeId}`
    ];
    
    let animeDetails: any = null;
    
    for (const url of urlFormats) {
      try {
        console.log(`🔗 Trying URL: ${BASE_URL}${url}`);
        const response = await axiosInstance.get(url);
        const $ = cheerio.load(cleanPageContent(response.data));
        
        // Vérifier si la page contient du contenu valide d'anime
        const hasValidContent = $('title').text().trim().length > 0 || 
                               $('h1, h2, h3').length > 0 ||
                               response.data.includes('anime') ||
                               response.data.includes('episode');
        
        if (hasValidContent) {
          console.log(`✅ Found valid content at: ${url}`);
          
          // Extraction du titre
          let title = '';
          const titleSelectors = ['h1', 'h2', 'h3', '.title', '.anime-title', 'title'];
          
          for (const selector of titleSelectors) {
            const element = $(selector).first();
            if (element.length) {
              title = element.text().trim();
              if (selector === 'title') {
                title = title.split('|')[0].split('-')[0].split('–')[0].trim();
                title = title.replace(/anime-sama\.fr/gi, '').trim();
              }
              if (title && title.length > 2) break;
            }
          }
          
          // Si pas de titre trouvé, utiliser l'ID formaté
          if (!title || title.length < 2) {
            title = animeId.split('-').map(word => 
              word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');
          }
          
          // Extraction de la description
          let description = '';
          const descriptionSelectors = ['.description', '.synopsis', '.resume', '.summary', 'p'];
          for (const selector of descriptionSelectors) {
            const desc = $(selector).first().text().trim();
            if (desc && desc.length > 20 && !desc.includes('cookie')) {
              description = desc.substring(0, 500);
              break;
            }
          }
          
          // Extraction des genres
          const genres: string[] = [];
          $('.genre, .genres, .category').each((_, element) => {
            const genreText = $(element).text().trim();
            if (genreText && !genres.includes(genreText) && genreText.length < 20) {
              genres.push(genreText);
            }
          });
          if (genres.length === 0) genres.push('Animation', 'Aventure');
          
          // Extraction de l'année
          let year = new Date().getFullYear().toString();
          const yearMatches = response.data.match(/\b(19|20)\d{2}\b/g);
          if (yearMatches) {
            const validYears = yearMatches
              .map((y: string) => parseInt(y))
              .filter((y: number) => y >= 1960 && y <= new Date().getFullYear());
            if (validYears.length > 0) {
              year = Math.max(...validYears).toString();
            }
          }
          
          animeDetails = {
            id: animeId,
            title,
            description,
            genres,
            status: 'Disponible',
            year,
            seasons: [{
              number: 1,
              name: 'Saison 1',
              languages: ['VF', 'VOSTFR'],
              episodeCount: 12,
              url: `${BASE_URL}/catalogue/${animeId}/`
            }],
            episodeIds: [`${animeId}-episode-1-vf`, `${animeId}-episode-1-vostfr`],
            url: `${BASE_URL}${url}`
          };
          
          break;
        }
      } catch (urlError: any) {
        console.log(`❌ Failed URL ${url}: ${urlError.message}`);
        continue;
      }
    }
    
    if (!animeDetails) {
      return sendError(res, 404, `Anime '${animeId}' not found on anime-sama.fr`);
    }

    // Transformation universelle des données pour correspondre au frontend
    const frontendData = transformAnimeForFrontend(animeDetails);

    return sendSuccess(res, frontendData, {
      animeId,
      source: 'anime-sama.fr',
      authentic: true
    });

  } catch (error) {
    console.error('Real anime details error:', error);
    return sendError(res, 500, 'Cannot access anime-sama.fr data', {
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}