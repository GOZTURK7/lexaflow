import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

interface SavedWord {
  id: string;
  word: string;
  source_lang: string;
  target_lang: string;
  created_at: string;
}

export function SavedWords() {
  const navigate = useNavigate();
  const { user, session, signOut } = useAuth();
  const [words, setWords] = useState<SavedWord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const handleExport = useCallback(async () => {
    if (!session) return;
    const res = await fetch(`${API_URL}/api/words/export`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lexaflow-words.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [session]);

  const fetchWords = useCallback(async (p: number) => {
    if (!session) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/words?page=${p}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      setWords(data.words ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (user) fetchWords(page);
  }, [user, page, fetchWords]);

  async function deleteWord(id: string) {
    if (!session) return;
    setWords((prev) => prev.filter((w) => w.id !== id));
    await fetch(`${API_URL}/api/words/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
  }

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-slate-900 px-4 pt-safe pb-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/")} className="p-1 text-slate-400 hover:text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-white font-bold text-lg">Saved Words</span>
          </div>
          {user && (
            <div className="flex items-center gap-3">
              <button
                onClick={handleExport}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                title="Export CSV"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                CSV
              </button>
              <button
                onClick={() => signOut().then(() => navigate("/"))}
                className="text-xs text-slate-400 hover:text-white"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      {!user ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <p className="text-gray-600 text-sm mb-4">Sign in to see your saved words</p>
          <button
            onClick={() => navigate("/login")}
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold"
          >
            Sign in
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="p-6 text-center text-gray-400 text-sm">Loading…</div>
          )}

          {!loading && words.length === 0 && (
            <div className="p-6 text-center text-gray-400 text-sm">
              No saved words yet. Tap a word in the reader to save it.
            </div>
          )}

          {!loading && words.length > 0 && (
            <>
              <ul className="divide-y divide-gray-100">
                {words.map((w) => (
                  <li key={w.id} className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900">
                    <div>
                      <span className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{w.word}</span>
                      <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">{w.source_lang} → {w.target_lang}</span>
                    </div>
                    <button
                      onClick={() => deleteWord(w.id)}
                      className="p-1.5 text-gray-300 hover:text-red-400 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 py-4">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 text-xs text-indigo-600 disabled:text-gray-300"
                  >
                    ← Prev
                  </button>
                  <span className="text-xs text-gray-400">{page} / {totalPages}</span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1 text-xs text-indigo-600 disabled:text-gray-300"
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
