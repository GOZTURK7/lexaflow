import type { LanguageCode, ExampleSentence } from "./types";

const BASE_URL = "https://tatoeba.org/api_v0/search";
const TIMEOUT_MS = 7000;
export const TATOEBA_TTL = 21600;

const TATOEBA_LANG: Record<LanguageCode, string> = {
  nl:"nld",en:"eng",tr:"tur",de:"deu",fr:"fra",es:"spa",it:"ita",pt:"por",
  ru:"rus",pl:"pol",sv:"swe",da:"dan",no:"nob",fi:"fin",cs:"ces",hu:"hun",ro:"ron",
  ja:"jpn",zh:"cmn",ko:"kor",ar:"ara",fa:"pes",hi:"hin",uk:"ukr",el:"ell",he:"heb",id:"ind",
};

interface TatoebaTranslation { id: number; text: string; lang: string; }
interface TatoebaSentence { id: number; text: string; lang: string; translations: TatoebaTranslation[][]; }

export async function fetchTatoeba(word: string, sourceLang: LanguageCode, targetLang: LanguageCode): Promise<ExampleSentence[]> {
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
      headers: { "User-Agent": "Mozilla/5.0 (compatible; LexaFlow/1.0)", "Accept": "application/json" },
    });
    if (!res.ok) return [];
    const data = await res.json() as { results: TatoebaSentence[] };
    if (!data.results?.length) return [];
    return data.results.slice(0, 5).map((s) => ({
      id: `tatoeba-${s.id}`,
      text: s.text,
      translation: s.translations.flat().find((t) => t.lang === to)?.text,
      source: "tatoeba" as const,
    }));
  } catch {
    return [];
  }
}
