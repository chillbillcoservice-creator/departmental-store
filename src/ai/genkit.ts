import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { ollama } from 'genkitx-ollama';

const aiModel = process.env.AI_MODEL || 'googleai/gemini-2.5-flash';

export const ai = genkit({
  plugins: [
    googleAI(),
    ollama({
      models: [{ name: 'gemma:2b' }],
      serverAddress: 'http://127.0.0.1:11434',
    }),
  ],
  model: aiModel,
});
