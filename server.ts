import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json());

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

// AI Chronicler Endpoint: Generates a rich lore chronicle of the synthetic world
app.post('/api/chronicler', async (req, res) => {
  try {
    const { worldName, epoch, population, factions, topEvents, economicStats, userPrompt } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      // High-quality deterministic fallback lore generator
      const fallbackThemes = [
        `Chronicle of Era ${epoch}: The world of ${worldName} experienced significant societal shifts. Factions navigated resource competition as population reached ${population}.`,
        `Historical Record: Economists recorded trade volume fluctuations, while pioneer agents pushed the boundaries of known territory.`,
        `The Great Annals: Observers noted emergent strategic alliances and shifting territory control across the continents.`
      ];
      const randomSummary = fallbackThemes[epoch % fallbackThemes.length];
      return res.json({
        success: true,
        source: 'local_engine',
        title: `Annals of ${worldName} — Epoch ${epoch}`,
        chronicle: `${randomSummary}\n\nKey Recorded Developments:\n${(topEvents || []).slice(0, 4).map((e: string, i: number) => `• [Year ${epoch}.${i + 1}] ${e}`).join('\n') || '• Continuous steady state operations across all biomes.'}\n\nPhilosophical Note: "In simple rules lie infinite tapestries."`,
        recommendation: 'Analyze faction wealth disparity and adjust environmental regeneration rate.'
      });
    }

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
      }
    });

    const text = response.text;
    let parsed;
    try {
      parsed = JSON.parse(text || '{}');
    } catch {
      parsed = {
        title: `Chronicles of ${worldName} (Epoch ${epoch})`,
        chronicle: text || 'The simulation continues to evolve.',
        recommendation: 'Observe agent survival behaviors.'
      };
    }

    res.json({
      success: true,
      source: 'gemini_ai',
      ...parsed
    });
  } catch (error: any) {
    console.error('Error in /api/chronicler:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate chronicle'
    });
  }
});

// Agent Thought Interceptor / Neural Spark endpoint
app.post('/api/agent-thought', async (req, res) => {
  try {
    const { agent, surroundings, recentMemory } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      const fallbackMonologues = [
        `"I must secure more resources before nightfall. My energy is at ${Math.round(agent?.energy || 50)}%."`,
        `"Trade prices are fluctuating. If I reach the market post soon, I can maximize my profit."`,
        `"The surrounding biome looks volatile. I should stick close to my faction allies."`,
        `"Curious anomaly detected nearby. Perhaps knowledge lies waiting to be uncovered."`
      ];
      const thought = fallbackMonologues[Math.floor(Math.random() * fallbackMonologues.length)];
      return res.json({
        success: true,
        thought,
        motive: agent?.goal || 'Survival & Prosperity'
      });
    }

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
    res.json({
      success: true,
      ...parsed
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', engine: 'Synthetic Reality Engine Core v2.0' });
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
