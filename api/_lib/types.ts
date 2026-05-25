export type LanguageCode =
  | "nl" | "en" | "tr" | "de" | "fr" | "es" | "it" | "pt"
  | "ru" | "pl" | "sv" | "da" | "no" | "fi" | "cs" | "hu" | "ro"
  | "ja" | "zh" | "ko" | "ar" | "fa" | "hi" | "uk" | "el" | "he" | "id";

export interface ExampleSentence {
  id: string;
  text: string;
  translation?: string;
  source: "wiktionary" | "tatoeba";
}

export interface DefinitionEntry {
  meaning: string;
  examples: ExampleSentence[];
  synonyms: string[];
  antonyms: string[];
}

export interface PartOfSpeechGroup {
  partOfSpeech: string;
  definitions: DefinitionEntry[];
}

export interface LookupResponse {
  langPair: string;
  cached: boolean;
  responseTimeMs: number;
  entry: {
    word: string;
    language: LanguageCode;
    phonetic?: string;
    partOfSpeechGroups: PartOfSpeechGroup[];
    examples: ExampleSentence[];
    translation?: string;
  };
}
