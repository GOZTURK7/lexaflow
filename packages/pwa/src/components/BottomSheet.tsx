import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { LookupResponse, LanguageCode, PartOfSpeechGroup } from "@lexaflow/shared";
import { LANGUAGE_LOCALE } from "@lexaflow/shared";
import { useAuth } from "../lib/AuthContext";

interface Props {
  open: boolean;
  word: string;
  sourceLang: LanguageCode;
  targetLang: LanguageCode;
  apiUrl: string;
  onClose: () => void;
}

const POS_COLORS: Record<string, string> = {
  Noun: "bg-blue-100 text-blue-700",
  Verb: "bg-green-100 text-green-700",
  Adjective: "bg-yellow-100 text-yellow-700",
  Adverb: "bg-purple-100 text-purple-700",
  Preposition: "bg-orange-100 text-orange-700",
  Pronoun: "bg-pink-100 text-pink-700",
  Conjunction: "bg-teal-100 text-teal-700",
  default: "bg-slate-100 text-slate-600",
};

function posColor(pos: string) {
  return POS_COLORS[pos] ?? POS_COLORS.default;
}

function PosGroup({ group }: { group: PartOfSpeechGroup }) {
  return (
    <div className="mb-4">
      <span className={`inline-block text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full mb-2 ${posColor(group.partOfSpeech)}`}>
        {group.partOfSpeech}
      </span>
      <ol className="space-y-2">
        {group.definitions.slice(0, 4).map((def, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-gray-400 text-sm mt-0.5 shrink-0">{i + 1}.</span>
            <div>
              <p className="text-sm text-gray-800 dark:text-gray-200 leading-snug">{def.meaning}</p>
              {def.examples.slice(0, 1).map((ex, j) => (
                <p key={j} className="text-xs text-gray-400 dark:text-gray-500 italic mt-0.5">"{ex.text}"</p>
              ))}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-3 p-5">
      <div className="h-4 bg-gray-200 rounded w-2/3" />
      <div className="h-3 bg-gray-200 rounded w-1/3" />
      <div className="space-y-2 pt-2">
        <div className="h-3 bg-gray-100 rounded w-full" />
        <div className="h-3 bg-gray-100 rounded w-5/6" />
        <div className="h-3 bg-gray-100 rounded w-4/5" />
      </div>
    </div>
  );
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  return filled ? (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M5 3a2 2 0 00-2 2v16l7-3 7 3V5a2 2 0 00-2-2H5z" />
    </svg>
  ) : (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3a2 2 0 00-2 2v16l7-3 7 3V5a2 2 0 00-2-2H5z" />
    </svg>
  );
}

export function BottomSheet({ open, word, sourceLang, targetLang, apiUrl, onClose }: Props) {
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const [data, setData] = useState<LookupResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useRef(0);

  // Fetch on open
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setData(null);
    setError(null);
    setSaved(false);

    fetch(`${apiUrl}/api/lookup?word=${encodeURIComponent(word)}&sourceLang=${sourceLang}&targetLang=${targetLang}`)
      .then(async (r) => {
        if (r.status === 404) { setError("not_found"); return; }
        if (!r.ok) { setError("error"); return; }
        const json = await r.json() as LookupResponse;
        setData(json);
      })
      .catch(() => setError("error"))
      .finally(() => setLoading(false));
  }, [open, word, sourceLang, targetLang, apiUrl]);

  // Swipe-down to close
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startY.current = e.touches[0]!.clientY;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    currentY.current = e.touches[0]!.clientY;
    const delta = currentY.current - startY.current;
    if (delta > 0 && sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${delta}px)`;
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    const delta = currentY.current - startY.current;
    if (sheetRef.current) {
      sheetRef.current.style.transform = "";
    }
    if (delta > 100) onClose();
  }, [onClose]);

  const handleTts = useCallback(() => {
    window.speechSynthesis.cancel();
    if (speaking) { setSpeaking(false); return; }
    const doSpeak = () => {
      const u = new SpeechSynthesisUtterance(word);
      u.lang = LANGUAGE_LOCALE[sourceLang];
      u.rate = 0.9;
      u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(u);
      setSpeaking(true);
    };
    if (window.speechSynthesis.getVoices().length > 0) doSpeak();
    else window.speechSynthesis.addEventListener("voiceschanged", doSpeak, { once: true });
  }, [word, sourceLang, speaking]);

  const handleSave = useCallback(async () => {
    if (!user || !session) {
      navigate("/login");
      return;
    }
    if (saved || saving) return;
    setSaving(true);
    setSaved(true); // optimistic
    try {
      await fetch(`${apiUrl}/api/words`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          word: word.toLowerCase(),
          sourceLang,
          targetLang,
          definitionSnapshot: data?.entry ?? null,
        }),
      });
    } catch {
      setSaved(false);
    } finally {
      setSaving(false);
    }
  }, [user, session, saved, saving, apiUrl, word, sourceLang, targetLang, data]);

  const tatoeba = data?.entry?.examples?.filter((e) => e.source === "tatoeba") ?? [];

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-40 animate-fade-in" onClick={onClose} />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 rounded-t-2xl shadow-2xl flex flex-col max-h-[75vh] transition-transform duration-200"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>

        {/* Header */}
        <div className="bg-slate-900 mx-3 rounded-xl px-4 py-3 shrink-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-amber-400 text-xl font-bold">{word}</span>
                {data?.entry.phonetic && (
                  <span className="text-slate-400 text-xs">{data.entry.phonetic}</span>
                )}
              </div>
              {data?.entry.translation && (
                <p className="text-slate-300 text-sm mt-0.5">{data.entry.translation}</p>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={handleTts}
                className={`p-1.5 rounded-full transition-colors ${speaking ? "text-amber-400 bg-slate-700" : "text-slate-400 hover:text-white hover:bg-slate-700"}`}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  {speaking ? (
                    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                  ) : (
                    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217z" clipRule="evenodd" />
                  )}
                </svg>
              </button>
              <button
                onClick={handleSave}
                title={saved ? "Saved" : user ? "Save word" : "Sign in to save"}
                className={`p-1.5 rounded-full transition-colors ${saved ? "text-amber-400 bg-slate-700" : "text-slate-400 hover:text-white hover:bg-slate-700"}`}
              >
                <BookmarkIcon filled={saved} />
              </button>
              <button onClick={onClose} className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 mt-3">
          {loading && <Skeleton />}

          {!loading && error && (
            <div className="p-5 text-center">
              <p className="text-gray-500 text-sm">
                {error === "not_found"
                  ? <><strong>{word}</strong> için tanım bulunamadı.</>
                  : "Servis geçici olarak kullanılamıyor."}
              </p>
              {error === "not_found" && <p className="text-gray-400 text-xs mt-1">Kelimenin kök halini deneyin.</p>}
            </div>
          )}

          {!loading && !error && data && (
            <div className="px-4 pb-4">
              {data.entry?.partOfSpeechGroups?.map((g, i) => (
                <PosGroup key={i} group={g} />
              ))}

              {tatoeba.length > 0 && (
                <div className="border-t border-gray-100 pt-3 mt-1">
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
          <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800 shrink-0 flex justify-between items-center">
            <span className="text-[10px] text-gray-400 dark:text-gray-600">{data?.cached ? "cached" : "Wiktionary · Tatoeba"}</span>
            {user ? (
              <button onClick={() => navigate("/words")} className="text-[10px] text-indigo-400 hover:text-indigo-600">
                My words →
              </button>
            ) : (
              <button onClick={() => navigate("/login")} className="text-[10px] text-indigo-400 hover:text-indigo-600">
                Sign in to save
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
