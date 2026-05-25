import type { LanguageCode, LookupResponse } from "./types";
import { cache } from "./cache";
import { fetchWiktionary, WIKTIONARY_TTL } from "./wiktionary";
import { fetchTatoeba, TATOEBA_TTL } from "./tatoeba";
import { fetchTranslation, MYMEMORY_TTL } from "./mymemory";

export async function lookupWord(word: string, sourceLang: LanguageCode, targetLang: LanguageCode): Promise<LookupResponse | null> {
  const start = Date.now();
  const key = `lookup:${word.toLowerCase()}:${sourceLang}:${targetLang}`;

  const cached = await cache.get<LookupResponse>(key);
  if (cached) return { ...cached, cached: true, responseTimeMs: Date.now() - start };

  const [wiktResult, tatoebaExamples] = await Promise.all([
    fetchWiktionary(word, sourceLang),
    fetchTatoeba(word, sourceLang, targetLang),
  ]);

  const wordForTranslation = wiktResult?.lemma ?? word;
  const translation = targetLang !== "en"
    ? await fetchTranslation(wordForTranslation, sourceLang, targetLang)
    : null;

  const langPair = `${sourceLang}-${targetLang}`;

  if (!wiktResult) {
    if (!translation) return null;
    const response: LookupResponse = {
      langPair, cached: false, responseTimeMs: Date.now() - start,
      entry: { word, language: sourceLang, partOfSpeechGroups: [], examples: tatoebaExamples, translation },
    };
    await cache.set(key, response, MYMEMORY_TTL);
    return response;
  }

  const response: LookupResponse = {
    langPair, cached: false, responseTimeMs: Date.now() - start,
    entry: {
      word, language: sourceLang,
      phonetic: wiktResult.phonetic,
      partOfSpeechGroups: wiktResult.partOfSpeechGroups,
      examples: tatoebaExamples,
      translation: translation ?? undefined,
    },
  };
  await cache.set(key, response, Math.min(WIKTIONARY_TTL, TATOEBA_TTL));
  return response;
}
