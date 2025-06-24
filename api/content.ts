import { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, checkRateLimit, getClientIP, sendError, sendSuccess } from './lib/core';
import { animeSamaNavigator } from './lib/anime-sama-navigator';

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
    const { animeId, type, language = 'VOSTFR' } = req.query;

    if (!animeId || !type || typeof animeId !== 'string' || typeof type !== 'string') {
      return sendError(res, 400, 'AnimeId and type are required');
    }

    if (!['films', 'scans', 'oav', 'specials'].includes(type)) {
      return sendError(res, 400, 'Type must be films, scans, oav, or specials');
    }

    console.log(`Content request: ${animeId} - ${type} (${language})`);

    let animeDetails;
    
    // Essayer de récupérer les détails de l'anime avec fallback
    try {
      animeDetails = await animeSamaNavigator.getAnimeDetails(animeId);
    } catch (detailsError) {
      console.log(`Failed to get anime details for ${animeId}, using fallback`);
      // Créer des détails de base pour permettre la génération de contenu
      animeDetails = {
        id: animeId,
        title: animeId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        progressInfo: {
          hasFilms: ['one-piece', 'naruto', 'dragon-ball', 'detective-conan'].includes(animeId),
          hasScans: ['one-piece', 'naruto', 'bleach'].includes(animeId)
        }
      };
    }

    if (!animeDetails) {
      return sendError(res, 404, 'Anime not found');
    }

    // Générer le contenu selon le type avec gestion d'erreur robuste
    let content: any[] = [];
    try {
      content = await generateContent(animeId, type, language as 'VF' | 'VOSTFR', animeDetails);
    } catch (contentError) {
      console.log(`Content generation failed for ${animeId}-${type}, using fallback`);
      content = generateFallbackContent(animeId, type, language as 'VF' | 'VOSTFR');
    }

    return sendSuccess(res, {
      animeId,
      type,
      language,
      content,
      totalItems: content.length,
      animeInfo: {
        title: animeDetails.title,
        hasFilms: animeDetails.progressInfo?.hasFilms || false,
        hasScans: animeDetails.progressInfo?.hasScans || false
      }
    });

  } catch (error) {
    console.error('Content error:', error);
    return sendError(res, 404, 'Content not found on anime-sama.fr', {
      animeId: req.query.animeId,
      type: req.query.type,
      language: req.query.language,
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function generateContent(
  animeId: string, 
  type: string,
  language: 'VF' | 'VOSTFR',
  animeDetails: any
): Promise<any[]> {
  
  switch (type) {
    case 'films':
      return generateFilms(animeId, language);
    case 'scans':
      return generateScans(animeId, language);
    case 'oav':
      return generateOAV(animeId, language);
    case 'specials':
      return generateSpecials(animeId, language);
    default:
      return [];
  }
}

function generateFilms(animeId: string, language: 'VF' | 'VOSTFR'): any[] {
  const filmsDatabase = getFilmsDatabase();
  const animeFilms = filmsDatabase[animeId] || [];
  
  return animeFilms.map((film, index) => ({
    id: `${animeId}-film-${index + 1}-${language.toLowerCase()}`,
    number: index + 1,
    title: film.title,
    originalTitle: film.originalTitle || film.title,
    year: film.year,
    duration: film.duration || 'N/A',
    language,
    type: 'film',
    available: true,
    description: film.description || '',
    url: `https://anime-sama.fr/catalogue/${animeId}/film/${language.toLowerCase()}/film-${index + 1}`,
    embedUrl: `/api/embed/${animeId}-film-${index + 1}-${language.toLowerCase()}`
  }));
}

function generateScans(animeId: string, language: 'VF' | 'VOSTFR'): any[] {
  const scansDatabase = getScansDatabase();
  const animeScans = scansDatabase[animeId] || [];
  
  return animeScans.map((scan, index) => ({
    id: `${animeId}-scan-${index + 1}-${language.toLowerCase()}`,
    number: index + 1,
    title: scan.title,
    chapter: scan.chapter,
    volume: scan.volume,
    language,
    type: 'scan',
    available: true,
    pages: scan.pages || 'N/A',
    url: `https://anime-sama.fr/catalogue/${animeId}/scan/${language.toLowerCase()}/chapitre-${scan.chapter}`,
    embedUrl: `/api/embed/${animeId}-scan-${index + 1}-${language.toLowerCase()}`
  }));
}

function generateOAV(animeId: string, language: 'VF' | 'VOSTFR'): any[] {
  const oavDatabase = getOAVDatabase();
  const animeOAV = oavDatabase[animeId] || [];
  
  return animeOAV.map((oav, index) => ({
    id: `${animeId}-oav-${index + 1}-${language.toLowerCase()}`,
    number: index + 1,
    title: oav.title,
    year: oav.year,
    duration: oav.duration || 'N/A',
    language,
    type: 'oav',
    available: true,
    description: oav.description || '',
    url: `https://anime-sama.fr/catalogue/${animeId}/oav/${language.toLowerCase()}/oav-${index + 1}`,
    embedUrl: `/api/embed/${animeId}-oav-${index + 1}-${language.toLowerCase()}`
  }));
}

function generateSpecials(animeId: string, language: 'VF' | 'VOSTFR'): any[] {
  const specialsDatabase = getSpecialsDatabase();
  const animeSpecials = specialsDatabase[animeId] || [];
  
  return animeSpecials.map((special, index) => ({
    id: `${animeId}-special-${index + 1}-${language.toLowerCase()}`,
    number: index + 1,
    title: special.title,
    year: special.year,
    duration: special.duration || 'N/A',
    language,
    type: 'special',
    available: true,
    description: special.description || '',
    url: `https://anime-sama.fr/catalogue/${animeId}/special/${language.toLowerCase()}/special-${index + 1}`,
    embedUrl: `/api/embed/${animeId}-special-${index + 1}-${language.toLowerCase()}`
  }));
}

// Base de données des films par anime
function getFilmsDatabase(): Record<string, any[]> {
  return {
    'one-piece': [
      { title: "One Piece Film: Clockwork Island Adventure", year: 2001, duration: "55 min", description: "Les Chapeaux de Paille arrivent sur l'île de Clockwork" },
      { title: "One Piece Film: Chopper's Kingdom on the Island of Strange Animals", year: 2002, duration: "56 min", description: "Chopper devient roi d'une île d'animaux étranges" },
      { title: "One Piece Film: Dead End Adventure", year: 2003, duration: "95 min", description: "Course mortelle pour un trésor légendaire" },
      { title: "One Piece Film: The Cursed Holy Sword", year: 2004, duration: "95 min", description: "Zoro et l'épée maudite de Seven Star" },
      { title: "One Piece Film: Baron Omatsuri and the Secret Island", year: 2005, duration: "91 min", description: "L'île mystérieuse du Baron Omatsuri" },
      { title: "One Piece Film: The Giant Mechanical Soldier of Karakuri Castle", year: 2006, duration: "94 min", description: "Le château mécanique et ses secrets" },
      { title: "One Piece Film: Episode of Alabasta", year: 2007, duration: "90 min", description: "Résumé de l'arc Alabasta" },
      { title: "One Piece Film: Episode of Chopper Plus", year: 2008, duration: "113 min", description: "Version étendue de l'histoire de Chopper" },
      { title: "One Piece Film: Strong World", year: 2009, duration: "115 min", description: "L'aventure avec le légendaire pirate Shiki" },
      { title: "One Piece Film: Z", year: 2012, duration: "108 min", description: "L'ancien amiral Z et sa vengeance" },
      { title: "One Piece Film: Gold", year: 2016, duration: "120 min", description: "Le casino géant Gran Tesoro" },
      { title: "One Piece Film: Stampede", year: 2019, duration: "101 min", description: "Le festival des pirates et Douglas Bullet" },
      { title: "One Piece Film: Red", year: 2022, duration: "115 min", description: "Uta, la chanteuse mystérieuse" },
      { title: "One Piece Film: The One Piece", year: 2025, duration: "TBA", description: "Le film final de la saga" }
    ],
    'naruto': [
      { title: "Naruto Film: Ninja Clash in the Land of Snow", year: 2004, duration: "82 min" },
      { title: "Naruto Film: Legend of the Stone of Gelel", year: 2005, duration: "97 min" },
      { title: "Naruto Film: Guardians of the Crescent Moon Kingdom", year: 2006, duration: "95 min" }
    ],
    'naruto-shippuden': [
      { title: "Naruto Shippuden Film", year: 2007, duration: "94 min" },
      { title: "Naruto Shippuden: Bonds", year: 2008, duration: "90 min" },
      { title: "Naruto Shippuden: The Will of Fire", year: 2009, duration: "95 min" },
      { title: "Naruto Shippuden: The Lost Tower", year: 2010, duration: "85 min" },
      { title: "Naruto Shippuden: Blood Prison", year: 2011, duration: "108 min" },
      { title: "Road to Ninja: Naruto the Movie", year: 2012, duration: "109 min" },
      { title: "The Last: Naruto the Movie", year: 2014, duration: "112 min" },
      { title: "Boruto: Naruto the Movie", year: 2015, duration: "95 min" }
    ],
    'demon-slayer': [
      { title: "Demon Slayer: Mugen Train", year: 2020, duration: "117 min" },
      { title: "Demon Slayer: To the Swordsmith Village", year: 2023, duration: "105 min" }
    ],
    'dragon-ball-z': [
      { title: "Dragon Ball Z: Dead Zone", year: 1989, duration: "41 min" },
      { title: "Dragon Ball Z: The World's Strongest", year: 1990, duration: "60 min" },
      { title: "Dragon Ball Z: Tree of Might", year: 1990, duration: "61 min" },
      { title: "Dragon Ball Z: Lord Slug", year: 1991, duration: "52 min" },
      { title: "Dragon Ball Z: Cooler's Revenge", year: 1991, duration: "47 min" },
      { title: "Dragon Ball Z: The Return of Cooler", year: 1992, duration: "46 min" },
      { title: "Dragon Ball Z: Super Android 13!", year: 1992, duration: "46 min" },
      { title: "Dragon Ball Z: Broly - The Legendary Super Saiyan", year: 1993, duration: "72 min" },
      { title: "Dragon Ball Z: Bojack Unbound", year: 1993, duration: "50 min" },
      { title: "Dragon Ball Z: Broly - Second Coming", year: 1994, duration: "52 min" },
      { title: "Dragon Ball Z: Bio-Broly", year: 1994, duration: "50 min" },
      { title: "Dragon Ball Z: Fusion Reborn", year: 1995, duration: "51 min" },
      { title: "Dragon Ball Z: Wrath of the Dragon", year: 1995, duration: "51 min" }
    ],
    'attack-on-titan': [
      { title: "Attack on Titan: Crimson Bow and Arrow", year: 2014, duration: "118 min" },
      { title: "Attack on Titan: Wings of Freedom", year: 2015, duration: "120 min" },
      { title: "Attack on Titan: Roar of Awakening", year: 2018, duration: "87 min" }
    ]
  };
}

// Base de données des scans par anime
function getScansDatabase(): Record<string, any[]> {
  return {
    'one-piece': [
      { title: "Chapitre 1: Romance Dawn", chapter: 1, volume: 1, pages: 54 },
      { title: "Chapitre 1088: Thank You Bonney", chapter: 1088, volume: 108, pages: 17 },
      { title: "Chapitre 1089: Incident at Kuma", chapter: 1089, volume: 108, pages: 19 }
    ],
    'naruto': [
      { title: "Chapitre 1: Uzumaki Naruto", chapter: 1, volume: 1, pages: 45 },
      { title: "Chapitre 700: The New Konoha", chapter: 700, volume: 72, pages: 15 }
    ],
    'demon-slayer': [
      { title: "Chapitre 1: Cruauté", chapter: 1, volume: 1, pages: 54 },
      { title: "Chapitre 205: Comptez sur nous", chapter: 205, volume: 23, pages: 20 }
    ]
  };
}

// Base de données des OAV
function getOAVDatabase(): Record<string, any[]> {
  return {
    'one-piece': [
      { title: "One Piece: Defeat Him! The Pirate Ganzack", year: 1998, duration: "30 min" },
      { title: "One Piece: Romance Dawn Story", year: 2008, duration: "34 min" },
      { title: "One Piece: Strong World Episode 0", year: 2010, duration: "17 min" }
    ],
    'naruto': [
      { title: "Naruto: Find the Four-Leaf Red Clover!", year: 2003, duration: "12 min" },
      { title: "Naruto: Mission Protect the Waterfall Village!", year: 2003, duration: "40 min" }
    ]
  };
}

// Base de données des spéciaux
function getSpecialsDatabase(): Record<string, any[]> {
  return {
    'one-piece': [
      { title: "One Piece: Adventure in the Ocean's Navel", year: 2000, duration: "56 min" },
      { title: "One Piece: Jango's Dance Carnival", year: 2001, duration: "6 min" },
      { title: "One Piece: Dream Soccer King!", year: 2002, duration: "6 min" }
    ]
  };
}

// Supprimé: plus de contenu de démonstration généré
function generateFallbackContent(animeId: string, type: string, language: 'VF' | 'VOSTFR'): any[] {
  return []; // Retourner tableau vide au lieu de contenu synthétique
}