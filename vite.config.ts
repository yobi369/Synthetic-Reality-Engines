import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  try {
    return new GoogleGenAI({ apiKey });
  } catch {
    return null;
  }
}

function sreApiPlugin(): Plugin {
  return {
    name: 'sre-api-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) {
          return next();
        }

        const readBody = async (): Promise<any> => {
          return new Promise((resolve) => {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
              try {
                resolve(body ? JSON.parse(body) : {});
              } catch {
                resolve({});
              }
            });
          });
        };

        if (req.url === '/api/health') {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ status: 'ok', engine: 'Synthetic Reality Engine Core v2.4' }));
          return;
        }

        if (req.url === '/api/chronicler' && req.method === 'POST') {
          const body = await readBody();
          const { worldName, epoch, population, factions, topEvents, economicStats, userPrompt } = body;
          const ai = getGeminiClient();

          if (!ai) {
            const fallbackThemes = [
              `Chronicle of Era ${epoch}: The world of ${worldName} experienced significant societal shifts. Factions navigated resource competition as population reached ${population}.`,
              `Historical Record: Economists recorded trade volume fluctuations, while pioneer agents pushed the boundaries of known territory.`,
              `The Great Annals: Observers noted emergent strategic alliances and shifting territory control across the continents.`
            ];
            const randomSummary = fallbackThemes[(epoch || 1) % fallbackThemes.length];
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              success: true,
              source: 'local_engine',
              title: `Annals of ${worldName} — Epoch ${epoch}`,
              chronicle: `${randomSummary}\n\nKey Recorded Developments:\n${(topEvents || []).slice(0, 4).map((e: string, i: number) => `• [Year ${epoch}.${i + 1}] ${e}`).join('\n') || '• Continuous steady state operations across all biomes.'}\n\nPhilosophical Note: "In simple rules lie infinite tapestries."`,
              recommendation: 'Analyze faction wealth disparity and adjust environmental regeneration rate.'
            }));
            return;
          }

          try {
            const prompt = `You are the Grand Cosmic Chronicler of a Synthetic Reality Engine named "${worldName}".
Context of the simulation:
- Current Epoch/Year: ${epoch}
- Living Population: ${population}
- Active Factions: ${JSON.stringify(factions || [])}
- Recent Emergent Events: ${JSON.stringify(topEvents || [])}
- Economic Indicators: ${JSON.stringify(economicStats || {})}
${userPrompt ? `Special Query/Event: ${userPrompt}` : ''}

Write an atmospheric, insightful, and dramatic 3-paragraph historical chronicle entry for this epoch.
Analyze the emergent phenomena (economic shifts, political struggles, evolutionary milestones).
Conclude with a 1-sentence "Cosmic Observation / Advice for the Architect".
Return JSON with format:
{
  "title": "Title of this Historical Era",
  "chronicle": "The full 3-paragraph chronicle text",
  "recommendation": "Advice for the architect"
}`;

            const aiRes = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: prompt,
              config: {
                responseMimeType: 'application/json',
              }
            });

            const parsed = JSON.parse(aiRes.text || '{}');
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, source: 'gemini_ai', ...parsed }));
          } catch (err: any) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              success: true,
              source: 'local_engine',
              title: `Annals of ${worldName} — Epoch ${epoch}`,
              chronicle: `Societies within ${worldName} continue their algorithmic journey. Population stands at ${population}.`,
              recommendation: 'Monitor agent survival cycles.'
            }));
          }
          return;
        }

        if (req.url === '/api/agent-thought' && req.method === 'POST') {
          const body = await readBody();
          const { agent, surroundings, recentMemory } = body;
          const ai = getGeminiClient();

          if (!ai) {
            const fallbackThoughts = [
              `"I must secure more resources before nightfall. My energy is at ${Math.round(agent?.energy || 50)}%."`,
              `"Trade prices are fluctuating. If I reach the market post soon, I can maximize my profit."`,
              `"The surrounding biome looks volatile. I should stick close to my faction allies."`
            ];
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              success: true,
              thought: fallbackThoughts[Math.floor(Math.random() * fallbackThoughts.length)],
              motive: agent?.goal || 'Survival & Exploration'
            }));
            return;
          }

          try {
            const prompt = `Inner consciousness of autonomous agent:
- Name: ${agent?.name || 'Unit-X'}
- Role: ${agent?.role || 'Pioneer'}
- Faction: ${agent?.factionId || 'Independent'}
- Energy: ${agent?.energy}% | Wealth: ${agent?.wealth}
- Directive: ${agent?.goal}
- Memory: ${recentMemory || 'Arrived in region'}

Generate a short 1-2 sentence first-person internal thought and a 3-word immediate motive.
Return JSON:
{
  "thought": "First-person thought in quotes",
  "motive": "Short immediate motive"
}`;

            const aiRes = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: prompt,
              config: { responseMimeType: 'application/json' }
            });

            const parsed = JSON.parse(aiRes.text || '{}');
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, ...parsed }));
          } catch (err: any) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, thought: `"Analyzing perimeter."`, motive: "Patrol" }));
          }
          return;
        }

        next();
      });
    }
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), sreApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
