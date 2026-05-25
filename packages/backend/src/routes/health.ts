import type { FastifyInstance } from "fastify";

const VERSION = process.env["npm_package_version"] ?? "0.0.1";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async (_req, reply) => {
    return reply.code(200).send({
      status: "ok",
      version: VERSION,
      env: process.env["NODE_ENV"] ?? "development",
      timestamp: new Date().toISOString(),
    });
  });
}
