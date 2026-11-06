import { describe, expect, test } from 'bun:test';
import { validateAgentThoughtInput, validateChroniclerInput } from '../server/ai-validation';

describe('AI endpoint payload validation', () => {
  test('accepts bounded chronicler context', () => {
    expect(validateChroniclerInput({ worldName: 'Gaia', epoch: 4, population: 120, factions: [], topEvents: ['A trade route opened'], economicStats: {}, userPrompt: '' })?.worldName).toBe('Gaia');
  });
  test('rejects malformed or oversized chronicler input', () => {
    expect(validateChroniclerInput({ worldName: 'Gaia', epoch: -1, population: 1 })).toBeNull();
    expect(validateChroniclerInput({ worldName: 'x'.repeat(101), epoch: 1, population: 1 })).toBeNull();
    expect(validateChroniclerInput({ worldName: 'Gaia', epoch: 1, population: 1, topEvents: Array(21).fill('event') })).toBeNull();
  });
  test('accepts bounded agent context and rejects unsafe fields', () => {
    expect(validateAgentThoughtInput({ agent: { name: 'Unit 1', health: 90 }, surroundings: 'Forest', recentMemory: 'Arrived' })?.agent.name).toBe('Unit 1');
    expect(validateAgentThoughtInput({ agent: { health: Number.POSITIVE_INFINITY } })).toBeNull();
    expect(validateAgentThoughtInput({ agent: {}, surroundings: 'x'.repeat(1_001) })).toBeNull();
  });
});
