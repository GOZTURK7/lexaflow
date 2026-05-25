import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Try monorepo root .env.local (when running from packages/backend)
config({ path: resolve(__dirname, "../../../.env.local"), override: false });
// Try local .env or .env.local fallback
config({ path: resolve(process.cwd(), ".env.local"), override: false });
config({ path: resolve(process.cwd(), ".env"), override: false });
