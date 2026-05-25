import type { LanguageCode, ExampleSentence } from "@lexaflow/shared";

const BASE_URL = "https://tatoeba.org/api_v0/search";
const TIMEOUT_MS = 5000;
const TTL_SECONDS = 21600; // 6 hours

export { TTL_SECONDS as TATOEBA_TTL };

// Tatoeba uses ISO 639-3 codes
const TATOEBA_LANG: Record<LanguageCode, string> = {
  nl: "nld",
  en: "eng",
  tr: "tur",
};

interface TatoebaTranslation {
  id: number;
  text: string;
  lang: string;
}

interface TatoebaSentence {
  id: number;
  text: string;
  lang: string;
  translations: TatoebaTranslation[][];
}

interface TatoebaResponse {
  results: TatoebaSentence[];
}

export async function fetchTatoeba(
  word: string,
  sourceLang: LanguageCode,
  targetLang: LanguageCode,
): Promise<ExampleSentence[]> {
  const from = TATOEBA_LANG[sourceLang];
  const to = TATOEBA_LANG[targetLang];

  const url = new URL(BASE_URL);
  url.searchParams.set("query", word.toLowerCase());
  url.searchParams.set("from", from);
  url.searchParams.set("to", to);
  url.searchParams.set("orphan", "no");
  url.searchParams.set("unapproved", "no");
  url.searchParams.set("limit", "5");

  try {
    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "User-Agent": "LexaFlow/1.0 (language learning app)" },
    });

    if (!res.ok) return [];

    const data = (await res.json()) as TatoebaResponse;
    if (!data.results?.length) return [];

    const sentences: ExampleSentence[] = [];

    for (const sentence of data.results) {
      // Find the first translation in the target language
      const translation = sentence.translations
        .flat()
        .find((t) => t.lang === to);

      sentences.push({
        id: `tatoeba-${sentence.id}`,
        text: sentence.text,
        translation: translation?.text,
        source: "tatoeba",
      });
    }

    return sentences.slice(0, 5);
  } catch {
    // Tatoeba timeout or error → return empty (non-fatal)
    return [];
  }
}
