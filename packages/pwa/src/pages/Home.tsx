import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import type { LanguageCode } from "@lexaflow/shared";
import { LANGUAGE_LABELS } from "@lexaflow/shared";
import { BottomSheet } from "../components/BottomSheet";
import { useAuth } from "../lib/AuthContext";
import { useTheme } from "../lib/useTheme";

const ALL_LANGS = Object.entries(LANGUAGE_LABELS) as [LanguageCode, string][];
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

const DEFAULTS = { sourceLang: "nl" as LanguageCode, targetLang: "tr" as LanguageCode };

function tokenize(text: string): string[] {
  return text.split(/(\s+|[.,;:!?«»""''„"()\[\]{}<>\/\\|@#%^&*+=~`])/).filter(Boolean);
}

function isWord(token: string): boolean {
  return /\p{L}/u.test(token);
}

export function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme, toggle } = useTheme();
  const [searchParams] = useSearchParams();
  const [text, setText] = useState("");
  const [sourceLang, setSourceLang] = useState<LanguageCode>(DEFAULTS.sourceLang);
  const [targetLang, setTargetLang] = useState<LanguageCode>(DEFAULTS.targetLang);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    const shared = searchParams.get("text") ?? searchParams.get("title") ?? searchParams.get("url");
    if (shared) setText(shared);
  }, [searchParams]);

  useEffect(() => {
    const saved = localStorage.getItem("langPair");
    if (saved?.includes("-")) {
      const [s, t] = saved.split("-") as [LanguageCode, LanguageCode];
      setSourceLang(s);
      setTargetLang(t);
    }
  }, []);

  function changeLang(src: LanguageCode, tgt: LanguageCode) {
    if (src === tgt) return;
    setSourceLang(src);
    setTargetLang(tgt);
    localStorage.setItem("langPair", `${src}-${tgt}`);
  }

  const handleWordTap = useCallback((word: string) => {
    setSelectedWord(word);
    setSheetOpen(true);
  }, []);

  const tokens = tokenize(text);
  const selectClass = "bg-slate-800 text-slate-300 text-xs rounded px-2 py-1 border-0 outline-none cursor-pointer";

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-slate-900 px-4 pt-safe pb-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-amber-400 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <span className="text-white font-bold text-lg">LexaFlow</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <select value={sourceLang} onChange={(e) => changeLang(e.target.value as LanguageCode, targetLang)} className={selectClass}>
                {ALL_LANGS.map(([code, label]) => (
                  <option key={code} value={code} disabled={code === targetLang}>{label}</option>
                ))}
              </select>
              <span className="text-slate-500 text-xs">→</span>
              <select value={targetLang} onChange={(e) => changeLang(sourceLang, e.target.value as LanguageCode)} className={selectClass}>
                {ALL_LANGS.map(([code, label]) => (
                  <option key={code} value={code} disabled={code === sourceLang}>{label}</option>
                ))}
              </select>
            </div>
            {/* Dark mode toggle */}
            <button onClick={toggle} className="p-1.5 text-slate-400 hover:text-white" title="Toggle dark mode">
              {theme === "dark" ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>
            {user ? (
              <button onClick={() => navigate("/words")} className="p-1.5 text-slate-400 hover:text-white" title="Saved words">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 3a2 2 0 00-2 2v16l7-3 7 3V5a2 2 0 00-2-2H5z" />
                </svg>
              </button>
            ) : (
              <button onClick={() => navigate("/login")} className="text-xs text-slate-400 hover:text-white">
                Sign in
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Text area or tokenized view */}
      <div className="flex-1 overflow-y-auto">
        {text.trim() === "" ? (
          <div className="p-4 h-full flex flex-col">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              Paste text below and tap any word to look it up.
            </p>
            <textarea
              className="flex-1 w-full p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 text-base leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder-gray-400 dark:placeholder-gray-600"
              placeholder="Paste Dutch, English, or any text here…"
              autoFocus
              onChange={(e) => setText(e.target.value)}
            />
          </div>
        ) : (
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-400">Tap a word to look it up</p>
              <button onClick={() => setText("")} className="text-xs text-indigo-500 hover:text-indigo-700">
                Clear
              </button>
            </div>
            <p className="text-base leading-8 text-gray-800 dark:text-gray-100 select-none">
              {tokens.map((token, i) =>
                isWord(token) ? (
                  <button
                    key={i}
                    onClick={() => handleWordTap(token)}
                    className="hover:bg-amber-100 dark:hover:bg-amber-900/40 active:bg-amber-200 dark:active:bg-amber-800/40 rounded px-0.5 -mx-0.5 transition-colors cursor-pointer"
                  >
                    {token}
                  </button>
                ) : (
                  <span key={i}>{token}</span>
                ),
              )}
            </p>
          </div>
        )}
      </div>

      {selectedWord && (
        <BottomSheet
          open={sheetOpen}
          word={selectedWord}
          sourceLang={sourceLang}
          targetLang={targetLang}
          apiUrl={API_URL}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </div>
  );
}
