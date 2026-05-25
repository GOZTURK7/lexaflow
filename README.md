# LexaFlow

Language Reactor benzeri kelime lookup aracı — web sayfasındaki herhangi bir kelimeye tıkla, bağlamlı sözlük popup'ı aç. Hollandaca/İngilizce/Türkçe öğrenim odaklı.

## Mimari

```
packages/
├── shared/      @lexaflow/shared  — TypeScript types + Zod schemas
├── backend/     @lexaflow/backend — Fastify API (dictionary engine)
├── extension/   @lexaflow/extension — Chrome/Firefox MV3 extension (Sprint 3)
└── pwa/         @lexaflow/pwa    — React PWA for mobile (Sprint 4)
```

## Local Development Setup

### Ön Koşullar

- Node.js >= 20 LTS
- pnpm >= 8 (`npm install -g pnpm`)
- Git >= 2.40

### 1. Repo'yu klonla ve bağımlılıkları yükle

```bash
git clone https://github.com/your-org/lexaflow-app.git
cd lexaflow-app
pnpm install
```

### 2. Ortam değişkenlerini ayarla

```bash
cp .env.example .env.local
```

`.env.local` dosyasını aç ve aşağıdaki değerleri doldur:

| Değişken | Kaynak | Zorunlu |
|----------|--------|---------|
| `SUPABASE_URL` | [Supabase Dashboard](https://app.supabase.com) → Settings → API | Evet |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API | Evet |
| `REDIS_URL` | [Upstash Console](https://console.upstash.com) | Hayır (geliştirmede in-memory cache) |
| `DEEPL_API_KEY` | [DeepL Pro API](https://www.deepl.com/pro-api) (ücretsiz tier) | Hayır (fallback devre dışı) |

### 3. Supabase'i başlat (lokal)

```bash
# Supabase CLI kurulu değilse: npm install -g supabase
supabase start
supabase db push
```

### 4. Dev server'ları başlat

```bash
pnpm dev
```

Backend: http://localhost:3001  
PWA: http://localhost:5173 (Sprint 4'ten itibaren)

### 5. Health check

```bash
curl http://localhost:3001/health
# {"status":"ok","version":"0.0.1","env":"development","timestamp":"..."}
```

## API

### GET /health
Sunucu durumu ve versiyon bilgisi.

### GET /api/lookup
Kelime tanımı sorgula.

**Query parametreleri:**
- `word` — Aranacak kelime (max 100 karakter)
- `sourceLang` — Kaynak dil: `nl`, `en`, `tr`
- `targetLang` — Hedef dil: `nl`, `en`, `tr`

**Desteklenen dil çiftleri:** `nl-en`, `en-nl`, `en-tr`, `tr-en`

**Örnek:**
```bash
curl "http://localhost:3001/api/lookup?word=huis&sourceLang=nl&targetLang=en"
```

## Sprint Durumu

| Sprint | Hafta | Durum |
|--------|-------|-------|
| 1 — Foundations | 1–2 | ✅ Tamamlandı |
| 2 — Dictionary Engine | 3–4 | 🔜 Sıradaki |
| 3 — Extension | 5–6 | Bekliyor |
| 4 — PWA & Accounts | 7–8 | Bekliyor |
| 5 — Polish & Ship | 9–10 | Bekliyor |

## Kullanılan Teknolojiler

- **Monorepo:** Turborepo + pnpm workspaces
- **Backend:** Fastify + TypeScript + Pino
- **Veritabanı:** Supabase (PostgreSQL + Auth + Realtime)
- **Cache:** Upstash Redis
- **Dictionary APIs:** Wiktionary, Tatoeba, DeepL (fallback)
- **Extension:** React + Tailwind + Manifest V3 (Sprint 3)
- **PWA:** Vite + React + vite-plugin-pwa (Sprint 4)
