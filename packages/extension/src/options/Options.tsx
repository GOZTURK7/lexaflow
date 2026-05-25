import { useState, useEffect } from "react";
import type { LanguageCode } from "@lexaflow/shared";
import { LANGUAGE_LABELS } from "@lexaflow/shared";

const ALL_LANGS = Object.entries(LANGUAGE_LABELS) as [LanguageCode, string][];

interface Settings {
  sourceLang: LanguageCode;
  targetLang: LanguageCode;
  showPhonetic: boolean;
  requireDoubleClick: boolean;
  apiUrl: string;
  darkMode: boolean;
}

const DEFAULTS: Settings = {
  sourceLang: "nl",
  targetLang: "en",
  showPhonetic: true,
  requireDoubleClick: true,
  apiUrl: "http://localhost:3001",
  darkMode: false,
};

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <div className="relative mt-0.5 shrink-0">
        <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <div className={`w-10 h-6 rounded-full transition-colors ${checked ? "bg-indigo-600" : "bg-gray-300"}`} />
        <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : "translate-x-0"}`} />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-800 group-hover:text-indigo-700 transition-colors">{label}</p>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
    </label>
  );
}

const PWA_URL = "http://localhost:5173";

function decodeJwtEmail(token: string): string | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const padded = payload.replace(/-/g, "+").replace(/_/g, "/").padEnd(payload.length + (4 - payload.length % 4) % 4, "=");
    const decoded = JSON.parse(atob(padded)) as Record<string, unknown>;
    return typeof decoded.email === "string" ? decoded.email : null;
  } catch {
    return null;
  }
}

export function Options() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [saved, setSaved] = useState(false);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);

  useEffect(() => {
    chrome.storage.sync.get(
      ["langPair", "showPhonetic", "requireDoubleClick", "apiUrl", "darkMode"],
      (stored) => {
        let src: LanguageCode = DEFAULTS.sourceLang;
        let tgt: LanguageCode = DEFAULTS.targetLang;
        if (typeof stored.langPair === "string" && stored.langPair.includes("-")) {
          const [s, t] = stored.langPair.split("-") as [LanguageCode, LanguageCode];
          src = s; tgt = t;
        }
        const dark = stored.darkMode ?? DEFAULTS.darkMode;
        setSettings({
          sourceLang: src,
          targetLang: tgt,
          showPhonetic: stored.showPhonetic ?? DEFAULTS.showPhonetic,
          requireDoubleClick: stored.requireDoubleClick ?? DEFAULTS.requireDoubleClick,
          apiUrl: typeof stored.apiUrl === "string" && stored.apiUrl ? stored.apiUrl : DEFAULTS.apiUrl,
          darkMode: dark,
        });
        // Apply dark mode to options page itself
        document.documentElement.classList.toggle("dark", dark);
      },
    );

    chrome.storage.local.get(["authToken"], ({ authToken }) => {
      if (typeof authToken === "string" && authToken) {
        setAccountEmail(decodeJwtEmail(authToken));
      }
    });

    // Live-update if token changes (e.g. user logs in via PWA while options is open)
    const listener = (changes: Record<string, chrome.storage.StorageChange>) => {
      if ("authToken" in changes) {
        const token = changes.authToken?.newValue as string | undefined;
        setAccountEmail(token ? decodeJwtEmail(token) : null);
      }
    };
    chrome.storage.local.onChanged.addListener(listener);
    return () => chrome.storage.local.onChanged.removeListener(listener);
  }, []);

  function save() {
    const langPair = `${settings.sourceLang}-${settings.targetLang}`;
    chrome.storage.sync.set({ ...settings, langPair }, () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
    document.documentElement.classList.toggle("dark", settings.darkMode);
  }

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      // prevent source === target
      if (key === "sourceLang" && value === prev.targetLang) {
        next.targetLang = prev.sourceLang;
      }
      if (key === "targetLang" && value === prev.sourceLang) {
        next.sourceLang = prev.targetLang;
      }
      return next;
    });
  }

  const selectClass = "w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-start justify-center pt-12 px-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">LexaFlow</h1>
            <p className="text-sm text-gray-500">Extension Settings</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Language Pair */}
          <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Language Pair</h2>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Reading in</label>
                <select
                  value={settings.sourceLang}
                  onChange={(e) => update("sourceLang", e.target.value as LanguageCode)}
                  className={selectClass}
                >
                  {ALL_LANGS.map(([code, label]) => (
                    <option key={code} value={code} disabled={code === settings.targetLang}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <span className="text-gray-400 text-lg mt-4">→</span>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Translate to</label>
                <select
                  value={settings.targetLang}
                  onChange={(e) => update("targetLang", e.target.value as LanguageCode)}
                  className={selectClass}
                >
                  {ALL_LANGS.map(([code, label]) => (
                    <option key={code} value={code} disabled={code === settings.sourceLang}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Behaviour */}
          <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Behaviour</h2>
            <div className="space-y-4">
              <Toggle
                checked={settings.showPhonetic}
                onChange={(v) => update("showPhonetic", v)}
                label="Show phonetic transcription"
                description="Display IPA pronunciation in the popup header"
              />
              <Toggle
                checked={settings.requireDoubleClick}
                onChange={(v) => update("requireDoubleClick", v)}
                label="Require double-click"
                description="Only trigger the popup on double-click instead of single click"
              />
              <Toggle
                checked={settings.darkMode}
                onChange={(v) => update("darkMode", v)}
                label="Dark mode"
                description="Use dark theme for the popup"
              />
            </div>
          </section>

          {/* Advanced */}
          <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Advanced</h2>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Backend API URL</span>
              <p className="text-xs text-gray-500 mt-0.5 mb-2">Change if you're running a self-hosted backend.</p>
              <input
                type="url"
                value={settings.apiUrl}
                onChange={(e) => update("apiUrl", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="http://localhost:3001"
              />
            </label>
          </section>

          {/* Account */}
          <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Account</h2>
            {accountEmail ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">{accountEmail}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Signed in — words sync across devices</p>
                </div>
                <button
                  onClick={() => { chrome.tabs.create({ url: `${PWA_URL}/words` }); }}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  My words →
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">Not signed in</p>
                  <p className="text-xs text-gray-500 mt-0.5">Sign in to save words across devices</p>
                </div>
                <button
                  onClick={() => { chrome.tabs.create({ url: `${PWA_URL}/login` }); }}
                  className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700"
                >
                  Sign in
                </button>
              </div>
            )}
          </section>

          {/* Save */}
          <button
            onClick={save}
            className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors ${
              saved ? "bg-green-600 text-white" : "bg-slate-900 hover:bg-slate-800 text-white"
            }`}
          >
            {saved ? "Saved!" : "Save Settings"}
          </button>

          <p className="text-center text-xs text-gray-400 pb-8">LexaFlow — language learning for the open web</p>
        </div>
      </div>
    </div>
  );
}
