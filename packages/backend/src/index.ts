import Fastify, { type FastifyError } from "fastify";
import { config } from "./config.js";
import { registerCors } from "./plugins/cors.js";
import { healthRoutes } from "./routes/health.js";
import { lookupRoutes } from "./routes/lookup.js";

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

  // Request ID header propagation
  app.addHook("onRequest", async (req) => {
    req.log.info({ method: req.method, url: req.url }, "incoming request");
  });

  await app.register(healthRoutes);
  await app.register(lookupRoutes);

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

async function start() {
  const app = await build();
  try {
    await app.listen({ port: config.PORT, host: config.HOST });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
