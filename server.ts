import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { randomBytes } from 'node:crypto';
import { applySecurityHeaders, createRateLimiter } from './server/security';
import { validateAgentThoughtInput, validateChroniclerInput } from './server/ai-validation';
import { appendIntervention, authenticateUser, createSession, deleteRun, findSession, getRun, listInterventions, listRuns, registerUser, revokeSession, saveRun, storageHealth } from './server/storage';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.disable('x-powered-by');
app.use(applySecurityHeaders);
app.use(express.json({ limit: '10mb', strict: true }));
const rateLimit = createRateLimiter({ windowMs: 60_000, maxEntries: 10_000 });
async function requireUser(req: express.Request, res: express.Response, next: express.NextFunction) {
  const header = req.header('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Authentication required.' });
  const user = await findSession(token);
  if (!user) return res.status(401).json({ error: 'Session expired or invalid.' });
  (req as any).user = user; (req as any).sessionToken = token; next();
}
const safeUser = (user: { id: string; email: string }) => ({ id: user.id, email: user.email });


// Lazy-initialize Gemini AI client safely
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  try {
    return new GoogleGenAI({ apiKey });
  } catch (err) {
    console.warn('Failed to initialize Gemini AI client:', err);
    return null;
  }
}

app.post('/api/auth/register', async (req, res) => {
  if (!rateLimit('register:' + (req.ip || 'unknown'), 5)) return res.status(429).json({ error: 'Too many account attempts.' });
  try { const user = await registerUser(String(req.body?.email || ''), String(req.body?.password || '')); const session = await createSession(user.id); res.status(201).json({ user: safeUser(user), ...session }); }
  catch (error: any) { res.status(400).json({ error: error.message || 'Registration failed.' }); }
});
app.post('/api/auth/login', async (req, res) => {
  if (!rateLimit('login:' + (req.ip || 'unknown'), 10)) return res.status(429).json({ error: 'Too many login attempts.' });
  const user = await authenticateUser(String(req.body?.email || ''), String(req.body?.password || ''));
  if (!user) return res.status(401).json({ error: 'Invalid email or password.' });
  res.json({ user: safeUser(user), ...await createSession(user.id) });
});
app.get('/api/auth/me', requireUser, (req, res) => res.json({ user: safeUser((req as any).user) }));
app.post('/api/auth/logout', requireUser, async (req, res) => { await revokeSession((req as any).sessionToken); res.status(204).end(); });
app.get('/api/runs', requireUser, async (req, res) => res.json({ runs: await listRuns((req as any).user.id) }));
app.post('/api/runs', requireUser, async (req, res) => {
  const b = req.body || {};
  if (typeof b.id !== 'string' || b.id.length > 100 || typeof b.name !== 'string' || b.name.length > 120 || typeof b.preset !== 'string' || !Number.isInteger(b.seed) || b.seed < 0 || b.seed > 0xffffffff || !Number.isInteger(b.tick) || b.tick < 0 || !b.snapshot || typeof b.snapshot !== 'object') return res.status(400).json({ error: 'Invalid run payload.' });
  try { const run = await saveRun((req as any).user.id, { id: b.id, name: b.name, preset: b.preset, seed: b.seed, tick: b.tick, snapshot: b.snapshot }); res.status(201).json({ run: { id: run.id, name: run.name, preset: run.preset, seed: run.seed, tick: run.tick, createdAt: run.createdAt, updatedAt: run.updatedAt } }); }
  catch { res.status(500).json({ error: 'Could not save run.' }); }
});
app.get('/api/runs/:id', requireUser, async (req, res) => { const run = await getRun((req as any).user.id, req.params.id); if (!run) return res.status(404).json({ error: 'Run not found.' }); res.json({ run }); });
app.delete('/api/runs/:id', requireUser, async (req, res) => { const ok = await deleteRun((req as any).user.id, req.params.id); if (!ok) return res.status(404).json({ error: 'Run not found.' }); res.status(204).end(); });
app.get('/api/runs/:id/interventions', requireUser, async (req, res) => {
  if (!await getRun((req as any).user.id, req.params.id)) return res.status(404).json({ error: 'Run not found.' });
  res.json({ interventions: await listInterventions((req as any).user.id, req.params.id) });
});
app.post('/api/runs/:id/interventions', requireUser, async (req, res) => {
  const ownerId = (req as any).user.id; const run = await getRun(ownerId, req.params.id);
  if (!run) return res.status(404).json({ error: 'Run not found.' });
  const b = req.body || {};
  if (!Number.isInteger(b.tick) || b.tick < 0 || !Number.isInteger(b.epoch) || b.epoch < 1 || typeof b.action !== 'string' || !/^[a-z][a-z0-9_.-]{1,79}$/.test(b.action) || !b.parameters || typeof b.parameters !== 'object' || Array.isArray(b.parameters)) return res.status(400).json({ error: 'Invalid intervention event.' });
  await appendIntervention({ id: typeof b.id === 'string' && /^[a-zA-Z0-9_-]{1,120}$/.test(b.id) ? b.id : randomBytes(16).toString('hex'), runId: run.id, ownerId, tick: b.tick, epoch: b.epoch, action: b.action, parameters: b.parameters, recordedAt: typeof b.recordedAt === 'string' ? b.recordedAt : new Date().toISOString() });
  res.status(201).json({ recorded: true });
});
// AI Chronicler Endpoint: Generates a rich lore chronicle of the synthetic world
app.post('/api/chronicler', async (req, res) => {
  if (!rateLimit('chronicler:' + (req.ip || 'unknown'), 20)) return res.status(429).json({ success: false, error: 'Rate limit exceeded.' });
  try {
    const input = validateChroniclerInput(req.body);
    if (!input) return res.status(400).json({ success: false, error: 'Invalid or oversized chronicler request.' });
    const { worldName, epoch, population, factions, topEvents, economicStats, userPrompt } = input;
    const ai = getGeminiClient();

    if (!ai) return res.status(503).json({ success: false, error: 'AI narration is unavailable: GEMINI_API_KEY is not configured.' });

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

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        httpOptions: { timeout: 20_000, retryOptions: { attempts: 1 } },
        abortSignal: AbortSignal.timeout(25_000),
      }
    });

    const text = response.text;
    let parsed;
    try {
      parsed = JSON.parse(text || '{}');
    } catch {
      return res.status(502).json({ success: false, error: 'AI narration provider returned invalid structured output.' });
    }
    if (!parsed || typeof parsed !== 'object' || typeof parsed.title !== 'string' || parsed.title.length > 160 || typeof parsed.chronicle !== 'string' || parsed.chronicle.length > 8_000 || typeof parsed.recommendation !== 'string' || parsed.recommendation.length > 1_000) {
      return res.status(502).json({ success: false, error: 'AI narration provider returned an invalid response shape.' });
    }

    res.json({
      success: true,
      source: 'gemini_ai',
      ...parsed
    });
  } catch (error: any) {
    console.error('Error in /api/chronicler:', error);
    res.status(502).json({ success: false, error: 'AI narration provider request failed.' });
  }
});

// Agent Thought Interceptor / Neural Spark endpoint
app.post('/api/agent-thought', async (req, res) => {
  if (!rateLimit('agent-thought:' + (req.ip || 'unknown'), 40)) return res.status(429).json({ success: false, error: 'Rate limit exceeded.' });
  try {
    const input = validateAgentThoughtInput(req.body);
    if (!input) return res.status(400).json({ success: false, error: 'Invalid or oversized agent-thought request.' });
    const { agent, surroundings, recentMemory } = input;
    const ai = getGeminiClient();

    if (!ai) return res.status(503).json({ success: false, error: 'AI agent narration is unavailable: GEMINI_API_KEY is not configured.' });

    const prompt = `You are the inner consciousness of an autonomous agent inside a Synthetic Reality Engine.
Agent Profile:
- Name: ${agent?.name || 'Unit-X'}
- Role: ${agent?.role || 'Pioneer'}
- Faction: ${agent?.faction || 'Independent'}
- Health: ${agent?.health}% | Energy: ${agent?.energy}% | Wealth: ${agent?.wealth} coins
- Current Goal: ${agent?.goal || 'Explore'}
- Sensory Surroundings: ${surroundings || 'Quiet terrain, sparse resources nearby'}
- Recent Memory: ${recentMemory || 'Arrived in region'}

Generate a short 1-2 sentence first-person internal thought and a 3-word immediate motive.
Return JSON:
{
  "thought": "First-person thought in quotes",
  "motive": "Short immediate motive"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    if (!parsed || typeof parsed !== 'object' || typeof parsed.thought !== 'string' || parsed.thought.length > 1_000 || typeof parsed.motive !== 'string' || parsed.motive.length > 120) {
      return res.status(502).json({ success: false, error: 'AI agent narration provider returned an invalid response shape.' });
    }
    res.json({ success: true, thought: parsed.thought, motive: parsed.motive });
  } catch (err) {
    console.error('Error in /api/agent-thought:', err);
    res.status(502).json({ success: false, error: 'AI agent narration provider request failed.' });
  }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try { await storageHealth(); res.json({ status: 'ok', engine: 'Synthetic Reality Engine', storage: 'ready' }); } catch { res.status(503).json({ status: 'degraded', storage: 'unavailable' }); }
});

// In production, serve the static frontend
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

app.listen(PORT, process.env.HOST || '0.0.0.0', () => {
  console.log(`Synthetic Reality Engine Server listening on port ${PORT}`);
});
