import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance, FastifyRequest } from "fastify";

export async function registerRateLimit(app: FastifyInstance) {
  await app.register(rateLimit, {
    global: true,
    // Authenticated requests (Bearer token present) get 200/min, anonymous get 60/min
    max: (req: FastifyRequest) => (req.headers.authorization?.startsWith("Bearer ") ? 200 : 60),
    timeWindow: 60_000,
    keyGenerator: (req: FastifyRequest) => {
      // Authenticated: scope by token suffix; anonymous: scope by IP
      if (req.headers.authorization?.startsWith("Bearer ")) {
        const token = req.headers.authorization.slice(7);
        return `auth:${token.slice(-20)}`;
      }
      return (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.ip ?? "unknown";
    },
    allowList: (req: FastifyRequest) => req.url === "/health",
    errorResponseBuilder: (_req, context) => ({
      error: "rate_limit_exceeded",
      message: "Too many requests",
      statusCode: 429,
      retryAfter: Math.ceil(context.ttl / 1000),
    }),
    addHeaders: {
      "x-ratelimit-limit": true,
      "x-ratelimit-remaining": true,
      "x-ratelimit-reset": true,
      "retry-after": true,
    },
  });
}
