import { useState, useEffect, useCallback, useRef } from "react";
import type { LookupResponse, LanguageCode, PartOfSpeechGroup } from "@lexaflow/shared";
import { LANGUAGE_LOCALE, LANGUAGE_LABELS } from "@lexaflow/shared";

const ALL_LANGS = Object.entries(LANGUAGE_LABELS) as [LanguageCode, string][];

interface PopupProps {
  word: string;
  x: number;
  y: number;
  sourceLang: LanguageCode;
  targetLang: LanguageCode;
  showPhonetic?: boolean;
  pageSentences?: string[];
  onClose: () => void;
}

const POS_COLORS: Record<string, string> = {
  Noun:        "bg-blue-100 text-blue-700",
  Verb:        "bg-green-100 text-green-700",
  Adjective:   "bg-yellow-100 text-yellow-700",
  Adverb:      "bg-purple-100 text-purple-700",
  Preposition: "bg-orange-100 text-orange-700",
  Pronoun:     "bg-pink-100 text-pink-700",
  Conjunction: "bg-teal-100 text-teal-700",
  default:     "bg-slate-100 text-slate-600",
};

function posColor(pos: string) {
  return POS_COLORS[pos] ?? POS_COLORS.default;
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-3 p-4">
      <div className="h-3 bg-gray-200 rounded w-3/4" />
      <div className="h-3 bg-gray-200 rounded w-1/2" />
      <div className="h-3 bg-gray-200 rounded w-2/3" />
      <div className="space-y-2 pt-2">
        <div className="h-2 bg-gray-100 rounded w-full" />
        <div className="h-2 bg-gray-100 rounded w-5/6" />
      </div>
    </div>
  );
}

function highlightWord(sentence: string, word: string) {
  const idx = sentence.toLowerCase().indexOf(word.toLowerCase());
  if (idx === -1) return <>{sentence}</>;
  return (
    <>
      {sentence.slice(0, idx)}
      <mark className="bg-amber-200 dark:bg-amber-900/50 text-inherit rounded-sm px-0.5 not-italic">
        {sentence.slice(idx, idx + word.length)}
      </mark>
      {sentence.slice(idx + word.length)}
    </>
  );
}

function PosGroup({ group }: { group: PartOfSpeechGroup }) {
  return (
    <div className="mb-3">
      <span className={`inline-block text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full mb-1.5 ${posColor(group.partOfSpeech)}`}>
        {group.partOfSpeech}
      </span>
      <ol className="space-y-1.5">
        {group.definitions.slice(0, 4).map((def, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-gray-400 text-xs mt-0.5 shrink-0">{i + 1}.</span>
            <div>
              <p className="text-sm text-gray-800 dark:text-gray-200 leading-snug">{def.meaning}</p>
              {def.examples.slice(0, 1).map((ex, j) => (
                <p key={j} className="text-xs text-gray-400 dark:text-gray-500 italic mt-0.5">
                  "{ex.text}"
                </p>
              ))}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function SpeakerIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      {active ? (
        <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
      ) : (
        <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217z" clipRule="evenodd" />
      )}
    </svg>
  );
}

export function Popup({ word, x, y, sourceLang, targetLang, showPhonetic = true, pageSentences = [], onClose }: PopupProps) {
  const [currentSrc, setCurrentSrc] = useState<LanguageCode>(sourceLang);
  const [currentTgt, setCurrentTgt] = useState<LanguageCode>(targetLang);
  const [data, setData] = useState<LookupResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  const POPUP_W = 360;
  const POPUP_H = 460;
  const MARGIN = 8;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const left = Math.min(Math.max(MARGIN, x), vw - POPUP_W - MARGIN);
  const fitsBelow = y + 16 + POPUP_H + MARGIN < vh;
  const top = fitsBelow ? y + 16 : Math.max(MARGIN, y - POPUP_H - 8);

  // Check if user is authenticated
  useEffect(() => {
    chrome.storage.local.get(["authToken"], ({ authToken }) => {
      setHasToken(typeof authToken === "string" && authToken.length > 0);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    setData(null);
    setError(null);
    setSaved(false);
    chrome.runtime.sendMessage(
      { type: "LOOKUP", word, sourceLang: currentSrc, targetLang: currentTgt },
      (res) => {
        setLoading(false);
        if (chrome.runtime.lastError) { setError("Extension error"); return; }
        if (res.ok) setData(res.data);
        else setError(res.statusCode === 404 ? "not_found" : "error");
      },
    );
  }, [word, currentSrc, currentTgt]);

  function changeLang(src: LanguageCode, tgt: LanguageCode) {
    if (src === tgt) return;
    setCurrentSrc(src);
    setCurrentTgt(tgt);
    chrome.storage.sync.set({ langPair: `${src}-${tgt}` });
  }

  const handleTts = useCallback(() => {
    window.speechSynthesis.cancel();
    if (speaking) { setSpeaking(false); return; }

    const doSpeak = () => {
      const u = new SpeechSynthesisUtterance(word);
      u.lang = LANGUAGE_LOCALE[currentSrc];
      u.rate = 0.9;
      u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(u);
      setSpeaking(true);
    };

    if (window.speechSynthesis.getVoices().length > 0) {
      doSpeak();
    } else {
      window.speechSynthesis.addEventListener("voiceschanged", doSpeak, { once: true });
    }
  }, [word, sourceLang, speaking]);

  const handleSave = useCallback(() => {
    if (saved) return;
    if (!hasToken) {
      chrome.runtime.sendMessage({ type: "OPEN_LOGIN" });
      return;
    }
    setSaved(true); // optimistic
    chrome.runtime.sendMessage(
      { type: "SAVE_WORD", word, sourceLang: currentSrc, targetLang: currentTgt },
      (res: { ok: boolean }) => {
        if (!res?.ok) setSaved(false);
      },
    );
  }, [saved, hasToken, word, currentSrc, currentTgt]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!popupRef.current) return;
      const shadowRoot = popupRef.current.getRootNode() as ShadowRoot;
      const host = shadowRoot?.host;
      if (host && e.target === host) return;
      onClose();
    };
    setTimeout(() => document.addEventListener("mousedown", handler), 50);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const tatoeba = data?.entry.examples.filter((e) => e.source === "tatoeba") ?? [];

  return (
    <div
      ref={popupRef}
      style={{ left, top, width: POPUP_W, maxHeight: POPUP_H, position: "fixed", zIndex: 2147483647 }}
      className="font-sans bg-white dark:bg-gray-900 rounded-xl shadow-2xl overflow-hidden flex flex-col"
    >
      {/* Header */}
      <div className="bg-slate-900 px-4 py-3 shrink-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-amber-400 text-xl font-bold leading-tight">{word}</span>
              {showPhonetic && data?.entry.phonetic && (
                <span className="text-slate-400 text-xs font-normal">{data.entry.phonetic}</span>
              )}
            </div>
            <div className="flex items-center gap-1 mt-1.5">
              <select
                value={currentSrc}
                onChange={(e) => changeLang(e.target.value as LanguageCode, currentTgt)}
                className="bg-slate-800 text-slate-300 text-xs rounded px-1.5 py-0.5 border-0 outline-none cursor-pointer"
              >
                {ALL_LANGS.map(([code, label]) => (
                  <option key={code} value={code} disabled={code === currentTgt}>{label}</option>
                ))}
              </select>
              <span className="text-slate-500 text-xs">→</span>
              <select
                value={currentTgt}
                onChange={(e) => changeLang(currentSrc, e.target.value as LanguageCode)}
                className="bg-slate-800 text-slate-300 text-xs rounded px-1.5 py-0.5 border-0 outline-none cursor-pointer"
              >
                {ALL_LANGS.map(([code, label]) => (
                  <option key={code} value={code} disabled={code === currentSrc}>{label}</option>
                ))}
              </select>
            </div>
            {data?.entry.translation && (
              <p className="text-slate-300 text-sm mt-1 leading-snug">{data.entry.translation}</p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0 mt-0.5">
            <button
              onClick={handleTts}
              title="Pronounce"
              className={`p-1.5 rounded-full transition-colors ${
                speaking ? "text-amber-400 bg-slate-700" : "text-slate-400 hover:text-white hover:bg-slate-700"
              }`}
            >
              <SpeakerIcon active={speaking} />
            </button>
            <button
              onClick={handleSave}
              title={saved ? "Saved" : hasToken ? "Save word" : "Sign in to save"}
              className={`p-1.5 rounded-full transition-colors ${
                saved ? "text-amber-400 bg-slate-700" : "text-slate-400 hover:text-white hover:bg-slate-700"
              }`}
            >
              {saved ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M5 3a2 2 0 00-2 2v16l7-3 7 3V5a2 2 0 00-2-2H5z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 3a2 2 0 00-2 2v16l7-3 7 3V5a2 2 0 00-2-2H5z" />
                </svg>
              )}
            </button>
            <button
              onClick={onClose}
              title="Close"
              className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="overflow-y-auto lexaflow-scroll flex-1">
        {loading && <Skeleton />}

        {!loading && error === "not_found" && (
          <div className="p-4 text-center">
            <p className="text-gray-500 text-sm">No definition found for <strong>{word}</strong></p>
            <p className="text-gray-400 text-xs mt-1">Try the base form of the word.</p>
          </div>
        )}

        {!loading && error === "error" && (
          <div className="p-4 text-center">
            <p className="text-gray-500 text-sm">Could not reach dictionary service.</p>
            <p className="text-gray-400 text-xs mt-1">Make sure the LexaFlow backend is running.</p>
          </div>
        )}

        {!loading && !error && data && (
          <div className="px-4 pt-3 pb-2 bg-white dark:bg-gray-900">
            {data.entry.partOfSpeechGroups.length > 0 && (
              <div className="mb-3">
                {data.entry.partOfSpeechGroups.map((g, i) => (
                  <PosGroup key={i} group={g} />
                ))}
              </div>
            )}

            {pageSentences.length > 0 && (
              <div className="border-t border-gray-100 dark:border-gray-700 pt-3 mb-3">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">
                  From this page
                </p>
                <ul className="space-y-2">
                  {pageSentences.map((s, i) => (
                    <li key={i} className="border-l-2 border-indigo-300 pl-2">
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-snug">
                        {highlightWord(s, word)}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {tatoeba.length > 0 && (
              <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">
                  Examples · Tatoeba
                </p>
                <ul className="space-y-2">
                  {tatoeba.slice(0, 3).map((ex) => (
                    <li key={ex.id} className="border-l-2 border-amber-300 pl-2">
                      <p className="text-sm text-gray-700 dark:text-gray-300">{ex.text}</p>
                      {ex.translation && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{ex.translation}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      {!loading && !error && (
        <div className="px-4 py-1.5 bg-slate-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between shrink-0">
          <span className="text-[10px] text-gray-400">
            {data?.cached ? "cached" : "Wiktionary · Tatoeba"}
          </span>
          <span className="text-[10px] text-gray-300">LexaFlow</span>
        </div>
      )}
    </div>
  );
}
