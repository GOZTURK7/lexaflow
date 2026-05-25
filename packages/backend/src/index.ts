import Fastify, { type FastifyError } from "fastify";
import { config } from "./config.js";
import { registerCors } from "./plugins/cors.js";
import { registerRateLimit } from "./plugins/rateLimit.js";
import { healthRoutes } from "./routes/health.js";
import { lookupRoutes } from "./routes/lookup.js";
import { wordRoutes } from "./routes/words.js";

async function build() {
  const app = Fastify({
    logger: {
      level: config.NODE_ENV === "production" ? "info" : "debug",
      ...(config.NODE_ENV !== "production" && {
        transport: {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "HH:MM:ss" },
        },
      }),
    },
    genReqId: () => crypto.randomUUID(),
  });

  await registerCors(app);
  await registerRateLimit(app);

  // Request ID header propagation
  app.addHook("onRequest", async (req) => {
    req.log.info({ method: req.method, url: req.url }, "incoming request");
  });

  await app.register(healthRoutes);
  await app.register(lookupRoutes);
  await app.register(wordRoutes);

  // Unhandled route
  app.setNotFoundHandler((_req, reply) => {
    reply.code(404).send({ error: "not_found", message: "Route not found", statusCode: 404 });
  });

  // Global error handler
  app.setErrorHandler((err: FastifyError, _req, reply) => {
    app.log.error(err);
    const statusCode = err.statusCode ?? 500;
    const message =
      config.NODE_ENV === "production" ? "An error occurred" : (err.message ?? "Unknown error");
    reply.code(statusCode).send({ error: "internal_error", message, statusCode });
  });

  return app;
}

// Fire-and-forget: warm up TLS/TCP connections to external APIs on startup
// so the first real user request doesn't pay the connection overhead.
function warmConnections() {
  const signal = AbortSignal.timeout(8000);
  Promise.allSettled([
    fetch("https://en.wiktionary.org/api/rest_v1/page/definition/test", { signal }),
    fetch("https://tatoeba.org/api_v0/search?query=test&from=nld&to=eng&limit=1", { signal }),
    fetch("https://translate.googleapis.com/translate_a/single?client=gtx&sl=nl&tl=en&dt=t&q=test", { signal }),
  ]);
}

async function start() {
  const app = await build();
  try {
    await app.listen({ port: config.PORT, host: config.HOST });
    warmConnections();
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
