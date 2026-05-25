import { z } from "zod";

// ─── Language Codes ───────────────────────────────────────────────────────────

export const LanguageCode = z.enum([
  "nl", // Dutch
  "en", // English
  "tr", // Turkish
  "de", // German
  "fr", // French
  "es", // Spanish
  "it", // Italian
  "pt", // Portuguese
  "ru", // Russian
  "pl", // Polish
  "sv", // Swedish
  "da", // Danish
  "no", // Norwegian
  "fi", // Finnish
  "cs", // Czech
  "hu", // Hungarian
  "ro", // Romanian
  "ja", // Japanese
  "zh", // Chinese
  "ko", // Korean
  "ar", // Arabic
  "fa", // Persian
  "hi", // Hindi
  "uk", // Ukrainian
  "el", // Greek
  "he", // Hebrew
  "id", // Indonesian
]);
export type LanguageCode = z.infer<typeof LanguageCode>;

// Any valid "xx-yy" pair where both sides are LanguageCodes and they differ
export const LanguagePair = z.string().regex(/^[a-z]{2,3}-[a-z]{2,3}$/);
export type LanguagePair = z.infer<typeof LanguagePair>;

export const LANGUAGE_LABELS: Record<LanguageCode, string> = {
  nl: "Dutch",
  en: "English",
  tr: "Turkish",
  de: "German",
  fr: "French",
  es: "Spanish",
  it: "Italian",
  pt: "Portuguese",
  ru: "Russian",
  pl: "Polish",
  sv: "Swedish",
  da: "Danish",
  no: "Norwegian",
  fi: "Finnish",
  cs: "Czech",
  hu: "Hungarian",
  ro: "Romanian",
  ja: "Japanese",
  zh: "Chinese",
  ko: "Korean",
  ar: "Arabic",
  fa: "Persian",
  hi: "Hindi",
  uk: "Ukrainian",
  el: "Greek",
  he: "Hebrew",
  id: "Indonesian",
};

export const LANGUAGE_LOCALE: Record<LanguageCode, string> = {
  nl: "nl-NL",
  en: "en-US",
  tr: "tr-TR",
  de: "de-DE",
  fr: "fr-FR",
  es: "es-ES",
  it: "it-IT",
  pt: "pt-PT",
  ru: "ru-RU",
  pl: "pl-PL",
  sv: "sv-SE",
  da: "da-DK",
  no: "nb-NO",
  fi: "fi-FI",
  cs: "cs-CZ",
  hu: "hu-HU",
  ro: "ro-RO",
  ja: "ja-JP",
  zh: "zh-CN",
  ko: "ko-KR",
  ar: "ar-SA",
  fa: "fa-IR",
  hi: "hi-IN",
  uk: "uk-UA",
  el: "el-GR",
  he: "he-IL",
  id: "id-ID",
};

// ─── Dictionary Entities ──────────────────────────────────────────────────────

export const ExampleSentenceSchema = z.object({
  id: z.string(),
  text: z.string(),
  translation: z.string().optional(),
  source: z.enum(["tatoeba", "wiktionary", "context"]),
});
export type ExampleSentence = z.infer<typeof ExampleSentenceSchema>;

export const DefinitionSchema = z.object({
  meaning: z.string(),
  examples: z.array(ExampleSentenceSchema).default([]),
  synonyms: z.array(z.string()).default([]),
  antonyms: z.array(z.string()).default([]),
});
export type Definition = z.infer<typeof DefinitionSchema>;

export const PartOfSpeechGroupSchema = z.object({
  partOfSpeech: z.string(),
  definitions: z.array(DefinitionSchema),
});
export type PartOfSpeechGroup = z.infer<typeof PartOfSpeechGroupSchema>;

export const WordEntrySchema = z.object({
  word: z.string(),
  language: LanguageCode,
  phonetic: z.string().optional(),
  partOfSpeechGroups: z.array(PartOfSpeechGroupSchema),
  examples: z.array(ExampleSentenceSchema).default([]),
  translation: z.string().optional(),
  audioUrl: z.string().url().optional(),
});
export type WordEntry = z.infer<typeof WordEntrySchema>;

// ─── API Request / Response ───────────────────────────────────────────────────

export const LookupRequestSchema = z.object({
  word: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[\p{L}\p{M}'\-\s]+$/u, "Word must contain only letters, hyphens, or apostrophes"),
  sourceLang: LanguageCode,
  targetLang: LanguageCode,
});
export type LookupRequest = z.infer<typeof LookupRequestSchema>;

export const LookupResponseSchema = z.object({
  entry: WordEntrySchema,
  langPair: LanguagePair,
  cached: z.boolean().default(false),
  responseTimeMs: z.number().optional(),
});
export type LookupResponse = z.infer<typeof LookupResponseSchema>;

export const TTSRequestSchema = z.object({
  word: z.string().min(1).max(100),
  language: LanguageCode,
});
export type TTSRequest = z.infer<typeof TTSRequestSchema>;

// ─── User / Word Saves ────────────────────────────────────────────────────────

export const SavedWordSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  word: z.string(),
  sourceLang: LanguageCode,
  targetLang: LanguageCode,
  definitionSnapshot: WordEntrySchema,
  createdAt: z.string().datetime(),
});
export type SavedWord = z.infer<typeof SavedWordSchema>;

// ─── API Error ────────────────────────────────────────────────────────────────

export const ApiErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
  statusCode: z.number(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

// ─── Settings ─────────────────────────────────────────────────────────────────

export const UserSettingsSchema = z.object({
  languagePair: LanguagePair,
  showPhonetic: z.boolean().default(true),
  requireDoubleClick: z.boolean().default(false),
});
export type UserSettings = z.infer<typeof UserSettingsSchema>;

export const DEFAULT_SETTINGS: UserSettings = {
  languagePair: "nl-en",
  showPhonetic: true,
  requireDoubleClick: true,
};
