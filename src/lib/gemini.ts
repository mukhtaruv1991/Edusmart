import { GoogleGenAI } from '@google/genai';

/**
 * Creates the Gemini client only when an AI action is requested.
 * This keeps the rest of EduSmart usable in preview/offline mode when no key is configured.
 */
export function getGeminiAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured. Add it to the local environment before using AI features.');
  }

  return new GoogleGenAI({ apiKey });
}
