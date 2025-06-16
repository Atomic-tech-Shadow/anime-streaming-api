import { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders } from './lib/core';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const swaggerSpec = {
    openapi: "3.0.0",
    info: {
      title: "Anime-Sama Streaming API",
      version: "2.0.0",
      description: "REST API for scraping anime-sama.fr with passive authentication and ad-blocking",
      contact: {
        name: "API Support",
        url: "https://github.com/your-repo"
      }
    },
    servers: [
      {
        url: "https://your-domain.vercel.app",
        description: "Production server"
      }
    ],
    paths: {
      "/api/search": {
        get: {
          summary: "Search anime",
          parameters: [
            {
              name: "query",
              in: "query",
              required: true,
              schema: { type: "string" },
              description: "Search query"
            }
          ],
          responses: {
            "200": {
              description: "Search results",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      data: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            id: { type: "string" },
                            title: { type: "string" },
                            url: { type: "string" },
                            image: { type: "string" },
                            type: { type: "string" }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "/api/anime/{id}": {
        get: {
          summary: "Get anime details",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "Anime ID"
            }
          ],
          responses: {
            "200": {
              description: "Anime details",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      data: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          title: { type: "string" },
                          description: { type: "string" },
                          image: { type: "string" },
                          genres: { type: "array", items: { type: "string" } },
                          status: { type: "string" },
                          year: { type: "string" },
                          episodes: { type: "array" },
                          url: { type: "string" }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "/api/episode/{id}": {
        get: {
          summary: "Get episode streaming sources",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "Episode ID (format: animeId-episode-number-language)"
            }
          ],
          responses: {
            "200": {
              description: "Episode streaming sources",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      data: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          title: { type: "string" },
                          sources: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                url: { type: "string" },
                                server: { type: "string" },
                                quality: { type: "string" },
                                language: { type: "string", enum: ["VF", "VOSTFR"] },
                                type: { type: "string", enum: ["iframe", "direct", "script"] }
                              }
                            }
                          },
                          url: { type: "string" }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "/api/trending": {
        get: {
          summary: "Get trending anime",
          responses: {
            "200": {
              description: "Trending anime list"
            }
          }
        }
      },
      "/api/catalogue": {
        get: {
          summary: "Get anime catalogue",
          parameters: [
            {
              name: "page",
              in: "query",
              schema: { type: "integer", default: 1 },
              description: "Page number"
            },
            {
              name: "genre",
              in: "query",
              schema: { type: "string" },
              description: "Filter by genre"
            },
            {
              name: "status",
              in: "query",
              schema: { type: "string" },
              description: "Filter by status"
            }
          ],
          responses: {
            "200": {
              description: "Catalogue with pagination"
            }
          }
        }
      },
      "/api/genres": {
        get: {
          summary: "Get available genres",
          responses: {
            "200": {
              description: "List of genres"
            }
          }
        }
      },
      "/api/random": {
        get: {
          summary: "Get random anime",
          responses: {
            "200": {
              description: "Random anime"
            }
          }
        }
      },
      "/api/scan/{id}": {
        get: {
          summary: "Get manga/scan details",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "Scan ID"
            },
            {
              name: "chapter",
              in: "query",
              schema: { type: "string" },
              description: "Specific chapter number"
            }
          ],
          responses: {
            "200": {
              description: "Scan details with chapters"
            }
          }
        }
      },
      "/api/search/advanced": {
        get: {
          summary: "Advanced search with filters",
          parameters: [
            {
              name: "query",
              in: "query",
              schema: { type: "string" },
              description: "Search query"
            },
            {
              name: "genre",
              in: "query",
              schema: { type: "string" },
              description: "Genre filter"
            },
            {
              name: "status",
              in: "query",
              schema: { type: "string" },
              description: "Status filter"
            },
            {
              name: "year",
              in: "query",
              schema: { type: "string" },
              description: "Year filter"
            },
            {
              name: "sort",
              in: "query",
              schema: { type: "string", enum: ["title", "year", "rating", "relevance"], default: "title" },
              description: "Sort field"
            },
            {
              name: "order",
              in: "query",
              schema: { type: "string", enum: ["asc", "desc"], default: "asc" },
              description: "Sort order"
            }
          ],
          responses: {
            "200": {
              description: "Advanced search results"
            }
          }
        }
      },
      "/api/status": {
        get: {
          summary: "API status and cache information",
          responses: {
            "200": {
              description: "API status"
            }
          }
        }
      },
      "/api/health": {
        get: {
          summary: "Health check",
          responses: {
            "200": {
              description: "Health status"
            }
          }
        }
      }
    },
    components: {
      schemas: {
        Error: {
          type: "object",
          properties: {
            error: { type: "boolean" },
            message: { type: "string" },
            status: { type: "integer" },
            timestamp: { type: "string" }
          }
        }
      }
    }
  };

  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Anime-Sama API Documentation</title>
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@3.52.5/swagger-ui.css" />
    <style>
        html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
        *, *:before, *:after { box-sizing: inherit; }
        body { margin:0; background: #fafafa; }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@3.52.5/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@3.52.5/swagger-ui-standalone-preset.js"></script>
    <script>
        window.onload = function() {
            const ui = SwaggerUIBundle({
                url: '#',
                spec: ${JSON.stringify(swaggerSpec)},
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIStandalonePreset
                ],
                plugins: [
                    SwaggerUIBundle.plugins.DownloadUrl
                ],
                layout: "StandaloneLayout"
            });
        };
    </script>
</body>
</html>
`;

  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(html);
}