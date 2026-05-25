import cors from "@fastify/cors";
import type { FastifyInstance } from "fastify";
import { config } from "../config.js";

export async function registerCors(app: FastifyInstance) {
  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin) {
        cb(null, true);
        return;
      }
      const allowed = config.ALLOWED_ORIGINS.some(
        (o) => origin === o || origin.startsWith(o),
      );
      cb(null, allowed);
    },
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  });
}
