import type { LanguageCode, PartOfSpeechGroup, ExampleSentence } from "./types";

const BASE_URL = "https://en.wiktionary.org/api/rest_v1/page/definition";
const TIMEOUT_MS = 7000;
export const WIKTIONARY_TTL = 86400;

interface WiktionaryDefinition {
  definition: string;
  parsedExamples?: Array<{ example: string; translation?: string }>;
  examples?: string[];
}
interface WiktionaryEntry { partOfSpeech: string; language: string; definitions: WiktionaryDefinition[]; }
type WiktionaryResponse = Record<string, WiktionaryEntry[]>;

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();
}

const LANG_KEY: Record<LanguageCode, string> = {
  nl:"nl",en:"en",tr:"tr",de:"de",fr:"fr",es:"es",it:"it",pt:"pt",
  ru:"ru",pl:"pl",sv:"sv",da:"da",no:"no",fi:"fi",cs:"cs",hu:"hu",ro:"ro",
  ja:"ja",zh:"zh",ko:"ko",ar:"ar",fa:"fa",hi:"hi",uk:"uk",el:"el",he:"he",id:"id",
};

const FORM_OF_RE = /\bof\s+([a-záéíóúàèìòùäëïöüâêîôûãõñçœæøåþðışğЀ-ӿͰ-Ͽ\w-]+)\s*\.?$/i;

function extractLemma(meanings: string[]): string | null {
  if (!meanings.length) return null;
  const lemmas = meanings.map((m) => {
    if (m.length > 100) return null;
    const match = m.match(FORM_OF_RE);
    return match ? (match[1] ?? "").toLowerCase() : null;
  });
  const unique = [...new Set(lemmas.filter((l): l is string => l !== null))];
  return unique.length === 1 ? (unique[0] ?? null) : null;
}

async function fetchRaw(word: string, sourceLang: LanguageCode) {
  const url = `${BASE_URL}/${encodeURIComponent(word.toLowerCase())}`;
  let data: WiktionaryResponse;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "User-Agent": "LexaFlow/1.0 (language learning app)", "Accept-Encoding": "gzip" },
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Wiktionary HTTP ${res.status}`);
    data = await res.json() as WiktionaryResponse;
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") return null;
    throw err;
  }
  const entries = data[LANG_KEY[sourceLang]];
  if (!entries?.length) return null;

  const partOfSpeechGroups: PartOfSpeechGroup[] = entries.map((entry) => ({
    partOfSpeech: entry.partOfSpeech,
    definitions: entry.definitions.map((def) => {
      const examples: ExampleSentence[] = [];
      if (def.parsedExamples?.length) {
        def.parsedExamples.slice(0, 2).forEach((ex, i) => examples.push({
          id: `wikt-${i}`, text: stripHtml(ex.example),
          translation: ex.translation ? stripHtml(ex.translation) : undefined, source: "wiktionary",
        }));
      } else if (def.examples?.length) {
        def.examples.slice(0, 2).forEach((ex, i) => examples.push({ id: `wikt-${i}`, text: stripHtml(ex), source: "wiktionary" }));
      }
      return { meaning: stripHtml(def.definition), examples, synonyms: [], antonyms: [] };
    }),
  }));
  return { partOfSpeechGroups };
}

export interface WiktionaryResult {
  phonetic?: string;
  partOfSpeechGroups: PartOfSpeechGroup[];
  lemma?: string;
}

export async function fetchWiktionary(word: string, sourceLang: LanguageCode): Promise<WiktionaryResult | null> {
  const raw = await fetchRaw(word, sourceLang);
  if (!raw) return null;
  const allMeanings = raw.partOfSpeechGroups.flatMap((g) => g.definitions.map((d) => d.meaning));
  const lemma = extractLemma(allMeanings);
  if (lemma && lemma !== word.toLowerCase()) {
    const baseRaw = await fetchRaw(lemma, sourceLang);
    if (baseRaw) return { ...baseRaw, lemma };
  }
  return raw;
}
