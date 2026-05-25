import type { LanguageCode, PartOfSpeechGroup, ExampleSentence } from "@lexaflow/shared";

const BASE_URL = "https://en.wiktionary.org/api/rest_v1/page/definition";
const TIMEOUT_MS = 5000;
const TTL_SECONDS = 86400; // 24 hours

export { TTL_SECONDS as WIKTIONARY_TTL };

// Wiktionary REST API response shape (simplified)
interface WiktionaryDefinition {
  definition: string;
  parsedExamples?: Array<{ example: string; translation?: string }>;
  examples?: string[];
}

interface WiktionaryEntry {
  partOfSpeech: string;
  language: string;
  definitions: WiktionaryDefinition[];
}

type WiktionaryResponse = Record<string, WiktionaryEntry[]>;

// Strip HTML tags from Wiktionary definition strings
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

// Map our LanguageCode to the key used in Wiktionary response
const WIKTIONARY_LANG_KEY: Record<LanguageCode, string> = {
  nl: "nl",
  en: "en",
  tr: "tr",
};

export interface WiktionaryResult {
  phonetic?: string;
  partOfSpeechGroups: PartOfSpeechGroup[];
}

export async function fetchWiktionary(
  word: string,
  sourceLang: LanguageCode,
): Promise<WiktionaryResult | null> {
  const url = `${BASE_URL}/${encodeURIComponent(word.toLowerCase())}`;

  let data: WiktionaryResponse;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "User-Agent": "LexaFlow/1.0 (language learning app)" },
    });

    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Wiktionary HTTP ${res.status}`);

    data = (await res.json()) as WiktionaryResponse;
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      return null;
    }
    throw err;
  }

  const langKey = WIKTIONARY_LANG_KEY[sourceLang];
  const entries = data[langKey];
  if (!entries?.length) return null;

  const partOfSpeechGroups: PartOfSpeechGroup[] = entries.map((entry) => ({
    partOfSpeech: entry.partOfSpeech,
    definitions: entry.definitions.map((def) => {
      const examples: ExampleSentence[] = [];

      // parsedExamples has both the sentence and its translation
      if (def.parsedExamples?.length) {
        def.parsedExamples.slice(0, 2).forEach((ex, i) => {
          examples.push({
            id: `wikt-${i}`,
            text: stripHtml(ex.example),
            translation: ex.translation ? stripHtml(ex.translation) : undefined,
            source: "wiktionary",
          });
        });
      } else if (def.examples?.length) {
        def.examples.slice(0, 2).forEach((ex, i) => {
          examples.push({
            id: `wikt-${i}`,
            text: stripHtml(ex),
            source: "wiktionary",
          });
        });
      }

      return {
        meaning: stripHtml(def.definition),
        examples,
        synonyms: [],
        antonyms: [],
      };
    }),
  }));

  return { partOfSpeechGroups };
}
