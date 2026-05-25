import type { LookupResponse, ApiError } from "@lexaflow/shared";

const DEFAULT_API_URL = "https://lexaflow.vercel.app";

interface LookupMessage {
  type: "LOOKUP";
  word: string;
  sourceLang: string;
  targetLang: string;
}

interface SaveWordMessage {
  type: "SAVE_WORD";
  word: string;
  sourceLang: string;
  targetLang: string;
}

interface OpenLoginMessage {
  type: "OPEN_LOGIN";
}

interface SetTokenMessage {
  type: "SET_TOKEN";
  token: string;
}

type LookupResult =
  | { ok: true; data: LookupResponse }
  | { ok: false; error: string; statusCode?: number };

type SaveResult = { ok: true; id: string } | { ok: false; error: string };

async function getApiUrl(): Promise<string> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(["apiUrl"], ({ apiUrl }) => {
      resolve(typeof apiUrl === "string" && apiUrl ? apiUrl : DEFAULT_API_URL);
    });
  });
}

function getAuthToken(): Promise<string | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get(["authToken"], ({ authToken }) => {
      resolve(typeof authToken === "string" && authToken ? authToken : null);
    });
  });
}

const PWA_URL = "http://localhost:5173";

chrome.runtime.onMessage.addListener(
  (msg: LookupMessage | SaveWordMessage | OpenLoginMessage | SetTokenMessage, _sender, sendResponse: (r: LookupResult | SaveResult) => void) => {
    if (msg.type === "OPEN_LOGIN") {
      chrome.tabs.create({ url: `${PWA_URL}/login` });
      return false;
    }

    if (msg.type === "SET_TOKEN") {
      chrome.storage.local.set({ authToken: msg.token });
      return false;
    }

    if (msg.type === "LOOKUP") {
      (async () => {
        const apiUrl = await getApiUrl();
        const url = `${apiUrl}/api/lookup?word=${encodeURIComponent(msg.word)}&sourceLang=${msg.sourceLang}&targetLang=${msg.targetLang}`;

        try {
          const res = await fetch(url, {
            signal: AbortSignal.timeout(10000),
            headers: { Accept: "application/json" },
          });

          const data = (await res.json()) as LookupResponse | ApiError;

          if (!res.ok) {
            const err = data as ApiError;
            sendResponse({ ok: false, error: err.message, statusCode: res.status });
            return;
          }

          sendResponse({ ok: true, data: data as LookupResponse });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Network error";
          sendResponse({ ok: false, error: message });
        }
      })();
      return true;
    }

    if (msg.type === "SAVE_WORD") {
      (async () => {
        const [apiUrl, token] = await Promise.all([getApiUrl(), getAuthToken()]);
        if (!token) {
          sendResponse({ ok: false, error: "not_authenticated" });
          return;
        }
        try {
          const res = await fetch(`${apiUrl}/api/words`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ word: msg.word, sourceLang: msg.sourceLang, targetLang: msg.targetLang }),
            signal: AbortSignal.timeout(8000),
          });
          const data = await res.json();
          if (!res.ok) {
            sendResponse({ ok: false, error: data.error ?? "save_failed" });
            return;
          }
          sendResponse({ ok: true, id: data.id });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Network error";
          sendResponse({ ok: false, error: message });
        }
      })();
      return true;
    }

    return false;
  },
);
