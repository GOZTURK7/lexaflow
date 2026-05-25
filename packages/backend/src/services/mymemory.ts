import type { LanguageCode } from "@lexaflow/shared";
import { config } from "../config.js";

const BASE_URL = "https://api.mymemory.translated.net/get";
const TIMEOUT_MS = 5000;
const TTL_SECONDS = 604800; // 7 days — translations rarely change

export { TTL_SECONDS as MYMEMORY_TTL };

interface MyMemoryResponse {
  responseData: {
    translatedText: string;
    match: number;
  };
  responseStatus: number;
  responseDetails?: string;
}

// MyMemory uses simple "nl|en" format
const MYMEMORY_LANG: Record<LanguageCode, string> = {
  nl: "nl",
  en: "en",
  tr: "tr",
};

export async function fetchTranslation(
  word: string,
  sourceLang: LanguageCode,
  targetLang: LanguageCode,
): Promise<string | null> {
  const langpair = `${MYMEMORY_LANG[sourceLang]}|${MYMEMORY_LANG[targetLang]}`;

  const url = new URL(BASE_URL);
  url.searchParams.set("q", word);
  url.searchParams.set("langpair", langpair);
  // Optional: add email for 10K words/day instead of 1K
  if (config.MYMEMORY_EMAIL) {
    url.searchParams.set("de", config.MYMEMORY_EMAIL);
  }

  try {
    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "User-Agent": "LexaFlow/1.0 (language learning app)" },
    });

    if (!res.ok) return null;

    const data = (await res.json()) as MyMemoryResponse;

    if (data.responseStatus !== 200) return null;

    const translated = data.responseData.translatedText;

    // MyMemory returns "MYMEMORY WARNING" strings when quota is exceeded
    if (!translated || translated.startsWith("MYMEMORY WARNING")) return null;

    // MyMemory sometimes echoes the word back when it has no translation
    if (translated.toLowerCase() === word.toLowerCase()) return null;

    return translated;
  } catch {
    return null;
  }
}
