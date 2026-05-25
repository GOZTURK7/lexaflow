import type { LanguageCode } from "./types";

const TIMEOUT_MS = 5000;
export const MYMEMORY_TTL = 604800;

const GT_LANG: Record<LanguageCode, string> = {
  nl:"nl",en:"en",tr:"tr",de:"de",fr:"fr",es:"es",it:"it",pt:"pt",
  ru:"ru",pl:"pl",sv:"sv",da:"da",no:"no",fi:"fi",cs:"cs",hu:"hu",ro:"ro",
  ja:"ja",zh:"zh-CN",ko:"ko",ar:"ar",fa:"fa",hi:"hi",uk:"uk",el:"el",he:"he",id:"id",
};

async function fetchGoogleTranslate(text: string, sourceLang: LanguageCode, targetLang: LanguageCode): Promise<string | null> {
  const url = new URL("https://translate.googleapis.com/translate_a/single");
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", GT_LANG[sourceLang]);
  url.searchParams.set("tl", GT_LANG[targetLang]);
  url.searchParams.set("dt", "t");
  url.searchParams.set("q", text);
  try {
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(TIMEOUT_MS), headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) return null;
    const data = await res.json() as unknown[][][];
    const translated = data?.[0]?.[0]?.[0];
    if (typeof translated !== "string" || !translated) return null;
    if (translated.toLowerCase() === text.toLowerCase()) return null;
    return translated;
  } catch { return null; }
}

async function fetchMyMemory(text: string, sourceLang: LanguageCode, targetLang: LanguageCode): Promise<string | null> {
  const url = new URL("https://api.mymemory.translated.net/get");
  url.searchParams.set("q", text);
  url.searchParams.set("langpair", `${GT_LANG[sourceLang]}|${GT_LANG[targetLang]}`);
  try {
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(TIMEOUT_MS), headers: { "User-Agent": "LexaFlow/1.0" } });
    if (!res.ok) return null;
    const data = await res.json() as { responseData: { translatedText: string }; responseStatus: number };
    if (data.responseStatus !== 200) return null;
    const t = data.responseData.translatedText;
    if (!t || t.startsWith("MYMEMORY WARNING") || t.toLowerCase() === text.toLowerCase()) return null;
    return t;
  } catch { return null; }
}

export async function fetchTranslation(word: string, sourceLang: LanguageCode, targetLang: LanguageCode): Promise<string | null> {
  const r = await fetchGoogleTranslate(word, sourceLang, targetLang);
  return r ?? fetchMyMemory(word, sourceLang, targetLang);
}
