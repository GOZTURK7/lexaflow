import type { LanguageCode, LookupResponse, LanguagePair } from "@lexaflow/shared";
import { cache } from "./cache.js";
import { fetchWiktionary, WIKTIONARY_TTL } from "./wiktionary.js";
import { fetchTatoeba, TATOEBA_TTL } from "./tatoeba.js";
import { fetchTranslation, MYMEMORY_TTL } from "./mymemory.js";

function cacheKey(word: string, sourceLang: LanguageCode, targetLang: LanguageCode): string {
  return `lookup:${word.toLowerCase()}:${sourceLang}:${targetLang}`;
}

export async function lookupWord(
  word: string,
  sourceLang: LanguageCode,
  targetLang: LanguageCode,
): Promise<LookupResponse | null> {
  const start = Date.now();
  const key = cacheKey(word, sourceLang, targetLang);

  // 1. Cache check
  const cached = await cache.get<LookupResponse>(key);
  if (cached) {
    return { ...cached, cached: true, responseTimeMs: Date.now() - start };
  }

  // 2. Wiktionary + Tatoeba in parallel
  const [wiktResult, tatoebaExamples] = await Promise.all([
    fetchWiktionary(word, sourceLang),
    fetchTatoeba(word, sourceLang, targetLang),
  ]);

  const langPair: LanguagePair = `${sourceLang}-${targetLang}` as LanguagePair;

  // 3. If Wiktionary found nothing → MyMemory translation only
  if (!wiktResult) {
    const translation = await fetchTranslation(word, sourceLang, targetLang);
    if (!translation) return null;

    const response: LookupResponse = {
      langPair,
      cached: false,
      responseTimeMs: Date.now() - start,
      entry: {
        word,
        language: sourceLang,
        partOfSpeechGroups: [],
        examples: tatoebaExamples,
        translation,
      },
    };

    await cache.set(key, response, MYMEMORY_TTL);
    return response;
  }

  // 4. Merge Tatoeba examples into the entry-level examples list
  // Wiktionary examples are already inside partOfSpeechGroups definitions
  const response: LookupResponse = {
    langPair,
    cached: false,
    responseTimeMs: Date.now() - start,
    entry: {
      word,
      language: sourceLang,
      phonetic: wiktResult.phonetic,
      partOfSpeechGroups: wiktResult.partOfSpeechGroups,
      examples: tatoebaExamples,
    },
  };

  await cache.set(key, response, Math.min(WIKTIONARY_TTL, TATOEBA_TTL));
  return response;
}
