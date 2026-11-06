import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { applySecurityHeaders, createClientDisconnectSignal, createRateLimiter } from './server/security';
import { validateAgentThoughtInput, validateChroniclerInput } from './server/ai-validation';

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
  const rateLimit = createRateLimiter({ windowMs: 60_000, maxEntries: 10_000 });
  return {
    name: 'sre-api-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) {
          return next();
        }
        applySecurityHeaders(req, res, () => {});
        if (Number(req.headers['content-length'] || 0) > 10 * 1024 * 1024) {
          res.statusCode = 413; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ success: false, error: 'Request body too large.' })); return;
        }

        const readBody = async (): Promise<any> => {
          return new Promise((resolve, reject) => {
            let body = '';
            req.on('data', chunk => { body += chunk; if (body.length > 10 * 1024 * 1024) { reject(new Error('Request body too large.')); } });
            req.on('end', () => {
              try {
                resolve(body ? JSON.parse(body) : {});
              } catch {
                reject(new Error('Invalid JSON request body.'));
              }
            });
          });
        };

        if (req.url === '/api/chronicler' && req.method === 'POST') {
          if (!rateLimit('chronicler:' + (req.socket.remoteAddress || 'unknown'), 20)) { res.statusCode = 429; res.end(JSON.stringify({ success: false, error: 'Rate limit exceeded.' })); return; }
          let body: unknown;
          try { body = await readBody(); } catch { res.statusCode = 400; res.end(JSON.stringify({ success: false, error: 'Invalid or oversized JSON request.' })); return; }
          const input = validateChroniclerInput(body);
          if (!input) { res.statusCode = 400; res.end(JSON.stringify({ success: false, error: 'Invalid or oversized chronicler request.' })); return; }
          const { worldName, epoch, population, factions, topEvents, economicStats, userPrompt } = input;
          const ai = getGeminiClient();

          if (!ai) { res.statusCode = 503; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ success: false, error: 'AI narration is unavailable: GEMINI_API_KEY is not configured.' })); return; }

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
                httpOptions: { timeout: 20_000, retryOptions: { attempts: 1 } },
                abortSignal: createClientDisconnectSignal(res, 25_000),
              }
            });

            const parsed = JSON.parse(aiRes.text || '{}');
            if (!parsed || typeof parsed !== 'object' || typeof parsed.title !== 'string' || parsed.title.length > 160 || typeof parsed.chronicle !== 'string' || parsed.chronicle.length > 8_000 || typeof parsed.recommendation !== 'string' || parsed.recommendation.length > 1_000) throw new Error('Invalid provider response shape');
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, source: 'gemini_ai', ...parsed }));
          } catch (err) {
            console.error('Development chronicler provider failure:', err);
            res.statusCode = 502; res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: 'AI narration provider request failed.' }));
          }
          return;
        }

        if (req.url === '/api/agent-thought' && req.method === 'POST') {
          if (!rateLimit('agent-thought:' + (req.socket.remoteAddress || 'unknown'), 40)) { res.statusCode = 429; res.end(JSON.stringify({ success: false, error: 'Rate limit exceeded.' })); return; }
          let body: unknown;
          try { body = await readBody(); } catch { res.statusCode = 400; res.end(JSON.stringify({ success: false, error: 'Invalid or oversized JSON request.' })); return; }
          const input = validateAgentThoughtInput(body);
          if (!input) { res.statusCode = 400; res.end(JSON.stringify({ success: false, error: 'Invalid or oversized agent-thought request.' })); return; }
          const { agent, surroundings, recentMemory } = input;
          const ai = getGeminiClient();

          if (!ai) { res.statusCode = 503; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ success: false, error: 'AI agent narration is unavailable: GEMINI_API_KEY is not configured.' })); return; }

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
              config: { responseMimeType: 'application/json', httpOptions: { timeout: 20_000, retryOptions: { attempts: 1 } }, abortSignal: createClientDisconnectSignal(res, 25_000) }
            });

            const parsed = JSON.parse(aiRes.text || '{}');
            if (!parsed || typeof parsed !== 'object' || typeof parsed.thought !== 'string' || parsed.thought.length > 1_000 || typeof parsed.motive !== 'string' || parsed.motive.length > 120) throw new Error('Invalid provider response shape');
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, thought: parsed.thought, motive: parsed.motive }));
          } catch (err) {
            console.error('Development agent-thought provider failure:', err);
            res.statusCode = 502; res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: 'AI agent narration provider request failed.' }));
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
    define: {
      __SRE_SOURCE_REVISION__: JSON.stringify(process.env.VITE_GIT_COMMIT_SHA || process.env.GITHUB_SHA || process.env.VERCEL_GIT_COMMIT_SHA || process.env.RENDER_GIT_COMMIT || 'unknown'),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      proxy: { '/api': 'http://127.0.0.1:3001' },
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
