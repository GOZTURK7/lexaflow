import { createElement } from "react";
import { createRoot } from "react-dom/client";
import type { LanguageCode } from "@lexaflow/shared";
import { Popup } from "./Popup";
// Tailwind CSS inlined into the Shadow DOM at build time
import styles from "./popup.css?inline";

interface PopupState {
  host: HTMLElement;
  root: ReturnType<typeof createRoot>;
}

let activePopup: PopupState | null = null;
let currentSettings = {
  sourceLang: "nl" as LanguageCode,
  targetLang: "en" as LanguageCode,
  showPhonetic: true,
  requireDoubleClick: true,
  darkMode: false,
};

// Load settings from storage
chrome.storage.sync.get(
  ["langPair", "showPhonetic", "requireDoubleClick", "darkMode"],
  ({ langPair, showPhonetic, requireDoubleClick, darkMode }) => {
    if (typeof langPair === "string" && langPair.includes("-")) {
      const [src, tgt] = langPair.split("-") as [LanguageCode, LanguageCode];
      currentSettings.sourceLang = src;
      currentSettings.targetLang = tgt;
    }
    if (typeof showPhonetic === "boolean") currentSettings.showPhonetic = showPhonetic;
    if (typeof requireDoubleClick === "boolean") currentSettings.requireDoubleClick = requireDoubleClick;
    if (typeof darkMode === "boolean") currentSettings.darkMode = darkMode;
  },
);

// Keep settings in sync when user changes them in options
chrome.storage.onChanged.addListener((changes) => {
  if (changes["langPair"]?.newValue) {
    const [src, tgt] = (changes["langPair"].newValue as string).split("-") as [LanguageCode, LanguageCode];
    currentSettings.sourceLang = src;
    currentSettings.targetLang = tgt;
  }
  if (typeof changes["showPhonetic"]?.newValue === "boolean")
    currentSettings.showPhonetic = changes["showPhonetic"].newValue as boolean;
  if (typeof changes["requireDoubleClick"]?.newValue === "boolean")
    currentSettings.requireDoubleClick = changes["requireDoubleClick"].newValue as boolean;
  if (typeof changes["darkMode"]?.newValue === "boolean")
    currentSettings.darkMode = changes["darkMode"].newValue as boolean;
});

function closePopup() {
  if (activePopup) {
    activePopup.root.unmount();
    activePopup.host.remove();
    activePopup = null;
  }
  window.speechSynthesis?.cancel();
}

function showPopup(word: string, x: number, y: number, pageSentences: string[] = []) {
  closePopup();

  // Create isolated Shadow DOM host
  const host = document.createElement("div");
  host.id = "lexaflow-root";
  // Position out of layout flow — React positions the popup with `position: fixed`
  host.style.cssText = "position:fixed;top:0;left:0;z-index:2147483647;pointer-events:none;";
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: "closed" });

  // Inject Tailwind styles into shadow DOM
  const styleEl = document.createElement("style");
  styleEl.textContent = styles;
  shadow.appendChild(styleEl);

  // Mount point
  const container = document.createElement("div");
  container.style.pointerEvents = "auto";
  if (currentSettings.darkMode) container.classList.add("dark");
  shadow.appendChild(container);

  const root = createRoot(container);
  root.render(
    createElement(Popup, {
      word,
      x,
      y,
      sourceLang: currentSettings.sourceLang,
      targetLang: currentSettings.targetLang,
      showPhonetic: currentSettings.showPhonetic,
      pageSentences,
      onClose: closePopup,
    }),
  );

  activePopup = { host, root };
}

// ─── Page sentence extraction ─────────────────────────────────────────────────
function getPageSentences(word: string): string[] {
  const main = document.querySelector("article, main, [role='main']") ?? document.body;
  const raw = (main as HTMLElement).innerText ?? "";
  if (raw.length > 80_000) return [];

  const wordLower = word.toLowerCase();
  const results: string[] = [];

  for (const chunk of raw.split(/\n+/)) {
    const parts = chunk.match(/[^.!?]+[.!?]*/g) ?? [chunk];
    for (const part of parts) {
      const s = part.replace(/\s+/g, " ").trim();
      if (s.length >= 10 && s.length <= 300 && s.toLowerCase().includes(wordLower)) {
        results.push(s);
        if (results.length >= 3) return results;
      }
    }
  }

  return results;
}

// ─── Word extraction ───────────────────────────────────────────────────────────
function getWordAtPoint(e: MouseEvent): string | null {
  const selection = window.getSelection();
  const selected = selection?.toString().trim() ?? "";

  // If user has a single word selected, use it
  if (selected && !/\s/.test(selected) && selected.length <= 60) {
    return selected;
  }

  // Otherwise try caretRangeFromPoint (click on a specific word)
  if (!document.caretRangeFromPoint) return null;
  const range = document.caretRangeFromPoint(e.clientX, e.clientY);
  if (!range) return null;

  // Expand range to word boundaries
  range.expand("word");
  const word = range.toString().trim().replace(/[^\p{L}\p{M}'-]/gu, "");
  return word.length > 0 && word.length <= 60 ? word : null;
}

// ─── Event listeners ──────────────────────────────────────────────────────────
function handleWordEvent(e: MouseEvent) {
  const target = e.target as Element;
  if (target.closest("input, textarea, [contenteditable], select")) return;
  if ((target as HTMLElement).id === "lexaflow-root") return;

  setTimeout(() => {
    const word = getWordAtPoint(e);
    if (word) showPopup(word, e.clientX, e.clientY, getPageSentences(word));
    else closePopup();
  }, 10);
}

document.addEventListener("mouseup", (e: MouseEvent) => {
  if (!currentSettings.requireDoubleClick) handleWordEvent(e);
});

document.addEventListener("dblclick", (e: MouseEvent) => {
  if (currentSettings.requireDoubleClick) handleWordEvent(e);
});

document.addEventListener("keydown", (e: KeyboardEvent) => {
  if (e.key === "Escape") closePopup();
});

// ─── Auth token sync from PWA ─────────────────────────────────────────────────
// PWA dispatches this event after login; content script forwards to background
window.addEventListener("lexaflow_token_sync", (e: Event) => {
  const token = (e as CustomEvent<string>).detail;
  chrome.runtime.sendMessage({ type: "SET_TOKEN", token });
});
