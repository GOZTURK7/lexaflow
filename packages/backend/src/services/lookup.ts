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

  const cached = await cache.get<LookupResponse>(key);
  if (cached) {
    return { ...cached, cached: true, responseTimeMs: Date.now() - start };
  }

  const needsTranslation = targetLang !== "en";

  // Fetch Wiktionary first so we know the lemma (base form) before translating.
  // Tatoeba runs in parallel since it doesn't depend on the lemma.
  const [wiktResult, tatoebaExamples] = await Promise.all([
    fetchWiktionary(word, sourceLang),
    fetchTatoeba(word, sourceLang, targetLang),
  ]);

  // Translate the base form (lemma) so inflected words get the correct translation.
  // e.g. "wapens" → lemma "wapen" → translate "wapen" → "silah" (not "silahlık")
  const wordForTranslation = wiktResult?.lemma ?? word;
  const translation = needsTranslation
    ? await fetchTranslation(wordForTranslation, sourceLang, targetLang)
    : null;

  const examples = tatoebaExamples;

  const langPair: LanguagePair = `${sourceLang}-${targetLang}` as LanguagePair;

  if (!wiktResult) {
    if (!translation) return null;
    const response: LookupResponse = {
      langPair, cached: false, responseTimeMs: Date.now() - start,
      entry: { word, language: sourceLang, partOfSpeechGroups: [], examples, translation },
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
      examples,
      translation: translation ?? undefined,
    },
  };

  await cache.set(key, response, Math.min(WIKTIONARY_TTL, TATOEBA_TTL));
  return response;
}
