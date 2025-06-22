import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'text/html');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Anime-Sama - Implementation Corrigée</title>
    <style>
        /* Variables CSS pour cohérence */
        :root {
          --primary-color: #2563eb;
          --primary-hover: #1d4ed8;
          --secondary-color: #64748b;
          --accent-color: #f59e0b;
          --success-color: #10b981;
          --error-color: #ef4444;
          --warning-color: #f59e0b;
          
          --bg-primary: #ffffff;
          --bg-secondary: #f8fafc;
          --bg-tertiary: #e2e8f0;
          --text-primary: #1e293b;
          --text-secondary: #64748b;
          --text-muted: #94a3b8;
          
          --border-color: #e2e8f0;
          --border-radius: 8px;
          --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
          --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
          
          --spacing-xs: 0.25rem;
          --spacing-sm: 0.5rem;
          --spacing-md: 1rem;
          --spacing-lg: 1.5rem;
          --spacing-xl: 2rem;
          --spacing-2xl: 3rem;
        }

        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
          line-height: 1.6;
          color: var(--text-primary);
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          margin: 0;
          padding: 0;
          min-height: 100vh;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: var(--spacing-md);
        }

        .demo-header {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          padding: var(--spacing-xl);
          border-radius: var(--border-radius);
          box-shadow: var(--shadow-lg);
          margin-bottom: var(--spacing-xl);
          text-align: center;
        }

        .demo-header h1 {
          color: var(--primary-color);
          margin: 0 0 var(--spacing-md) 0;
          font-size: 2.5rem;
          font-weight: 700;
        }

        .demo-header p {
          color: var(--text-secondary);
          margin: 0;
          font-size: 1.1rem;
        }

        .fixes-summary {
          background: var(--bg-primary);
          border-radius: var(--border-radius);
          padding: var(--spacing-xl);
          margin-bottom: var(--spacing-xl);
          box-shadow: var(--shadow-md);
        }

        .fixes-summary h2 {
          color: var(--primary-color);
          margin: 0 0 var(--spacing-lg) 0;
          font-size: 1.8rem;
          border-bottom: 2px solid var(--primary-color);
          padding-bottom: var(--spacing-sm);
        }

        .fixes-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: var(--spacing-lg);
          margin-top: var(--spacing-lg);
        }

        .fix-card {
          background: var(--bg-secondary);
          border-radius: var(--border-radius);
          padding: var(--spacing-lg);
          border-left: 4px solid var(--success-color);
        }

        .fix-card h3 {
          color: var(--text-primary);
          margin: 0 0 var(--spacing-md) 0;
          font-size: 1.1rem;
          font-weight: 600;
        }

        .fix-card p {
          color: var(--text-secondary);
          margin: 0;
          font-size: 0.9rem;
          line-height: 1.5;
        }

        .api-demo {
          background: var(--bg-primary);
          border-radius: var(--border-radius);
          padding: var(--spacing-xl);
          box-shadow: var(--shadow-md);
          margin-bottom: var(--spacing-xl);
        }

        .api-demo h2 {
          color: var(--primary-color);
          margin: 0 0 var(--spacing-lg) 0;
          font-size: 1.8rem;
        }

        .api-endpoint {
          font-family: 'Monaco', 'Consolas', monospace;
          background: var(--text-primary);
          color: #e5e7eb;
          padding: var(--spacing-md);
          border-radius: var(--border-radius);
          margin: var(--spacing-md) 0;
          overflow-x: auto;
          font-size: 0.9rem;
        }

        .test-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: var(--spacing-sm);
          margin: var(--spacing-lg) 0;
        }

        .test-button {
          background: var(--primary-color);
          color: white;
          padding: var(--spacing-sm) var(--spacing-lg);
          border: none;
          border-radius: var(--border-radius);
          cursor: pointer;
          font-weight: 500;
          font-size: 0.9rem;
          transition: background-color 0.2s ease;
        }

        .test-button:hover {
          background: var(--primary-hover);
        }

        .test-button:disabled {
          background: var(--secondary-color);
          cursor: not-allowed;
        }

        .test-results {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius);
          padding: var(--spacing-md);
          margin-top: var(--spacing-lg);
          max-height: 400px;
          overflow-y: auto;
          display: none;
        }

        .test-results pre {
          margin: 0;
          white-space: pre-wrap;
          font-size: 0.85rem;
          color: var(--text-primary);
          font-family: 'Monaco', 'Consolas', monospace;
        }

        .loading { color: var(--warning-color); }
        .success { color: var(--success-color); }
        .error { color: var(--error-color); }

        .implementation-guide {
          background: var(--bg-primary);
          border-radius: var(--border-radius);
          padding: var(--spacing-xl);
          box-shadow: var(--shadow-md);
        }

        .implementation-guide h2 {
          color: var(--primary-color);
          margin: 0 0 var(--spacing-lg) 0;
          font-size: 1.8rem;
        }

        .code-block {
          background: var(--bg-tertiary);
          border-radius: var(--border-radius);
          padding: var(--spacing-md);
          margin: var(--spacing-md) 0;
          font-family: 'Monaco', 'Consolas', monospace;
          font-size: 0.85rem;
          overflow-x: auto;
        }

        .highlight {
          background: linear-gradient(135deg, #fef3c7 0%, #f59e0b 100%);
          color: #92400e;
          padding: var(--spacing-md);
          border-radius: var(--border-radius);
          margin: var(--spacing-lg) 0;
          border-left: 4px solid var(--warning-color);
        }

        @media (max-width: 768px) {
          .container {
            padding: var(--spacing-sm);
          }
          
          .demo-header {
            padding: var(--spacing-lg);
          }
          
          .demo-header h1 {
            font-size: 2rem;
          }
          
          .fixes-grid {
            grid-template-columns: 1fr;
          }
          
          .test-buttons {
            flex-direction: column;
          }
          
          .test-button {
            width: 100%;
          }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="demo-header">
            <h1>Page Anime-Sama - Tous les Bugs Corrigés</h1>
            <p>Implémentation complète avec corrections de tous les problèmes critiques identifiés</p>
        </div>

        <div class="fixes-summary">
            <h2>Corrections Appliquées</h2>
            <div class="fixes-grid">
                <div class="fix-card">
                    <h3>Race Conditions Éliminées</h3>
                    <p>Synchronisation parfaite entre setSelectedEpisode() et loadEpisodeSources() avec utilisation de useRef et request IDs uniques.</p>
                </div>
                
                <div class="fix-card">
                    <h3>Changement de Langue Optimisé</h3>
                    <p>Préservation de l'épisode actuel lors du switch VF/VOSTFR. Plus de retour forcé à l'épisode 1.</p>
                </div>
                
                <div class="fix-card">
                    <h3>Cache Local Intelligent</h3>
                    <p>Système de cache avec TTL de 5 minutes pour réduire les appels API redondants et améliorer les performances.</p>
                </div>
                
                <div class="fix-card">
                    <h3>Retry Automatique</h3>
                    <p>Gestion robuste des timeouts et erreurs serveur avec retry automatique et délai exponentiel.</p>
                </div>
                
                <div class="fix-card">
                    <h3>Interface Responsive</h3>
                    <p>Adaptation complète mobile et tablette avec breakpoints optimisés et design flexible.</p>
                </div>
                
                <div class="fix-card">
                    <h3>Gestion d'Erreurs Améliorée</h3>
                    <p>Messages utilisateur spécifiques par type d'erreur avec actions suggérées.</p>
                </div>
            </div>
        </div>

        <div class="api-demo">
            <h2>Test de l'API Anime-Sama</h2>
            <p>API de production utilisée exclusivement :</p>
            <div class="api-endpoint">https://api-anime-sama.onrender.com</div>
            
            <div class="test-buttons">
                <button class="test-button" onclick="testHealthEndpoint()">Test Health</button>
                <button class="test-button" onclick="testSearchEndpoint()">Test Search</button>
                <button class="test-button" onclick="testAnimeDetails()">Test One Piece</button>
                <button class="test-button" onclick="testSeasonEpisodes()">Test Saison</button>
                <button class="test-button" onclick="testEpisodeSources()">Test Sources Épisode</button>
            </div>
            
            <div id="test-results" class="test-results">
                <pre id="results-content"></pre>
            </div>
        </div>

        <div class="implementation-guide">
            <h2>Guide d'Implémentation</h2>
            
            <div class="highlight">
                <strong>Note Importante :</strong> Cette implémentation corrige tous les problèmes critiques identifiés dans votre documentation d'erreurs. Le composant React complet est disponible dans <code>client/src/pages/anime-sama-fixed.tsx</code>.
            </div>

            <h3>1. Structure des Corrections</h3>
            <div class="code-block">
// Cache intelligent avec TTL
class EpisodeCache {
  private cache = new Map&lt;string, EpisodeDetail&gt;();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes
  
  get(key: string): any | null {
    // Validation expiration + retour données cachées
  }
  
  set(key: string, value: any): void {
    // Stockage intelligent par type de données
  }
}

// Prévention race conditions
const loadEpisodeSources = useCallback(async (episodeToLoad: Episode) =&gt; {
  const requestId = \`\${episodeToLoad.id}_\${Date.now()}\`;
  currentRequestRef.current = requestId;
  
  // Annulation requêtes précédentes
  if (abortControllerRef.current) {
    abortControllerRef.current.abort();
  }
  
  // Validation cohérence avant traitement
  if (currentRequestRef.current !== requestId) {
    return; // Requête obsolète
  }
  
  // Traitement sécurisé...
}, []);
            </div>

            <h3>2. Changement de Langue Corrigé</h3>
            <div class="code-block">
const handleLanguageChange = useCallback(async (newLanguage: 'VF' | 'VOSTFR') =&gt; {
  const currentEpisodeNumber = selectedEpisode?.episodeNumber;
  
  setCurrentLanguage(newLanguage);
  
  // Recharger épisodes avec nouvelle langue
  const episodesList = await loadSeasonEpisodes(anime.id, selectedSeason.number, newLanguage);
  setEpisodes(episodesList);
  
  // Retrouver le MÊME épisode dans la nouvelle langue
  if (currentEpisodeNumber) {
    const sameEpisode = episodesList.find(ep =&gt; ep.episodeNumber === currentEpisodeNumber);
    if (sameEpisode) {
      await loadEpisodeSources(sameEpisode);
    }
  }
}, [selectedSeason, anime, selectedEpisode?.episodeNumber]);
            </div>

            <h3>3. Retry Automatique</h3>
            <div class="code-block">
const fetchWithRetry = async (url: string, options: FetchOptions = {}) =&gt; {
  const { maxRetries = 3, retryDelay = 1000, timeout = 30000 } = options;
  
  for (let attempt = 1; attempt &lt;= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() =&gt; controller.abort(), timeout);
      
      const response = await fetch(url, { signal: controller.signal });
      
      if (!response.ok) {
        throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
      }
      
      return await response.json();
    } catch (error) {
      if (attempt === maxRetries) {
        throw new Error(\`Échec après \${maxRetries} tentatives\`);
      }
      
      // Délai exponentiel
      await new Promise(resolve =&gt; 
        setTimeout(resolve, retryDelay * Math.pow(2, attempt - 1))
      );
    }
  }
};
            </div>

            <h3>4. Utilisation du Composant</h3>
            <div class="code-block">
import { AnimeSamaPageFixed } from './client/src/pages/anime-sama-fixed';

// Dans votre application React
function App() {
  return (
    &lt;div&gt;
      &lt;AnimeSamaPageFixed /&gt;
    &lt;/div&gt;
  );
}
            </div>
        </div>
    </div>

    <script>
        const API_BASE = 'https://api-anime-sama.onrender.com';
        
        function showResults(content, type = 'info') {
            const resultsDiv = document.getElementById('test-results');
            const resultsContent = document.getElementById('results-content');
            
            resultsDiv.style.display = 'block';
            resultsContent.className = type;
            resultsContent.textContent = content;
        }
        
        async function testHealthEndpoint() {
            showResults('Vérification de l\\'état de l\\'API...', 'loading');
            
            try {
                const response = await fetch(\`\${API_BASE}/api/health\`);
                const data = await response.json();
                
                showResults(
                    \`✅ API Fonctionnelle\\n\\n\` +
                    \`Status: \${data.data.status}\\n\` +
                    \`Service: \${data.data.service}\\n\` +
                    \`Version: \${data.data.version}\\n\` +
                    \`Environment: \${data.data.environment}\\n\` +
                    \`Uptime: \${Math.round(data.data.uptime)}s\\n\` +
                    \`Memory: \${data.data.memory.used}MB / \${data.data.memory.total}MB\`,
                    'success'
                );
            } catch (error) {
                showResults(
                    \`❌ Erreur API Health\\n\\n\` +
                    \`Message: \${error.message}\\n\` +
                    \`Vérifiez la connexion à l'API de production.\`,
                    'error'
                );
            }
        }
        
        async function testSearchEndpoint() {
            showResults('Recherche "One Piece"...', 'loading');
            
            try {
                const response = await fetch(\`\${API_BASE}/api/search?q=one piece\`);
                const data = await response.json();
                
                if (data.success && data.data.length > 0) {
                    const anime = data.data[0];
                    showResults(
                        \`✅ Recherche Réussie\\n\\n\` +
                        \`Anime: \${anime.title}\\n\` +
                        \`ID: \${anime.id}\\n\` +
                        \`Description: \${anime.description.substring(0, 150)}...\\n\` +
                        \`Genres: \${anime.genres.join(', ')}\\n\` +
                        \`Année: \${anime.year}\\n\` +
                        \`Status: \${anime.status}\`,
                        'success'
                    );
                } else {
                    showResults('❌ Aucun résultat trouvé pour "One Piece"', 'error');
                }
            } catch (error) {
                showResults(\`❌ Erreur Recherche: \${error.message}\`, 'error');
            }
        }
        
        async function testAnimeDetails() {
            showResults('Chargement détails One Piece...', 'loading');
            
            try {
                const response = await fetch(\`\${API_BASE}/api/anime/one-piece\`);
                const data = await response.json();
                
                if (data.success && data.data) {
                    const anime = data.data;
                    showResults(
                        \`✅ Détails Anime Chargés\\n\\n\` +
                        \`Titre: \${anime.title}\\n\` +
                        \`Status: \${anime.status}\\n\` +
                        \`Saisons: \${anime.seasons.length}\\n\` +
                        \`Genres: \${anime.genres.join(', ')}\\n\` +
                        \`Progression: \${anime.progressInfo?.advancement || 'N/A'}\\n\` +
                        \`Total épisodes: \${anime.progressInfo?.totalEpisodes || 'N/A'}\\n\` +
                        \`Films: \${anime.progressInfo?.hasFilms ? 'Oui' : 'Non'}\\n\` +
                        \`Scans: \${anime.progressInfo?.hasScans ? 'Oui' : 'Non'}\`,
                        'success'
                    );
                } else {
                    showResults('❌ Impossible de récupérer les détails', 'error');
                }
            } catch (error) {
                showResults(\`❌ Erreur Détails: \${error.message}\`, 'error');
            }
        }
        
        async function testSeasonEpisodes() {
            showResults('Chargement épisodes saison One Piece...', 'loading');
            
            try {
                const response = await fetch(\`\${API_BASE}/api/seasons?animeId=one-piece&season=21&language=vostfr\`);
                const data = await response.json();
                
                if (data.success && data.data?.episodes) {
                    const episodes = data.data.episodes;
                    const seasonInfo = data.data.seasonInfo;
                    showResults(
                        \`✅ Épisodes Saison Chargés\\n\\n\` +
                        \`Saison: \${seasonInfo.name}\\n\` +
                        \`Nombre d'épisodes: \${episodes.length}\\n\` +
                        \`Range épisodes: \${episodes[0].episodeNumber} - \${episodes[episodes.length-1].episodeNumber}\\n\` +
                        \`Premier: \${episodes[0].title}\\n\` +
                        \`Dernier: \${episodes[episodes.length-1].title}\\n\` +
                        \`Langue: \${episodes[0].language}\\n\` +
                        \`Disponibilité: \${episodes.filter(ep => ep.available).length}/\${episodes.length} disponibles\`,
                        'success'
                    );
                } else {
                    showResults('❌ Impossible de récupérer les épisodes', 'error');
                }
            } catch (error) {
                showResults(\`❌ Erreur Épisodes: \${error.message}\`, 'error');
            }
        }
        
        async function testEpisodeSources() {
            showResults('Test sources épisode One Piece...', 'loading');
            
            try {
                const response = await fetch(\`\${API_BASE}/api/episode/one-piece-episode-1087-vostfr\`);
                const data = await response.json();
                
                if (data.success && data.data) {
                    const episode = data.data;
                    showResults(
                        \`✅ Sources Épisode Trouvées\\n\\n\` +
                        \`Épisode: \${episode.episodeNumber} - \${episode.title}\\n\` +
                        \`Anime: \${episode.animeTitle}\\n\` +
                        \`Sources disponibles: \${episode.sources.length}\\n\` +
                        \`Serveurs: \${episode.availableServers.join(', ')}\\n\` +
                        \`URL: \${episode.url}\\n\\n\` +
                        \`Détail sources:\\n\` +
                        episode.sources.map(source => 
                            \`- \${source.server} (\${source.quality}) - \${source.type}\`
                        ).join('\\n'),
                        'success'
                    );
                } else {
                    showResults('❌ Aucune source trouvée pour cet épisode', 'error');
                }
            } catch (error) {
                showResults(\`❌ Erreur Sources: \${error.message}\`, 'error');
            }
        }
        
        // Test automatique au chargement
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                testHealthEndpoint();
            }, 1000);
        });
    </script>
</body>
</html>`;

  res.status(200).send(html);
}