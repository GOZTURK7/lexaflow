import type { FastifyInstance } from "fastify";
import { LookupRequestSchema } from "@lexaflow/shared";
import type { ApiError } from "@lexaflow/shared";
import { lookupWord } from "../services/lookup.js";

export async function lookupRoutes(app: FastifyInstance) {
  app.get<{
    Querystring: { word: string; sourceLang: string; targetLang: string };
  }>("/api/lookup", async (req, reply) => {
    const parsed = LookupRequestSchema.safeParse(req.query);
    if (!parsed.success) {
      const error: ApiError = {
        error: "validation_error",
        message: parsed.error.issues.map((i) => i.message).join("; "),
        statusCode: 400,
      };
      return reply.code(400).send(error);
    }

    const { word, sourceLang, targetLang } = parsed.data;

    if (sourceLang === targetLang) {
      const error: ApiError = {
        error: "invalid_language_pair",
        message: "sourceLang and targetLang must be different",
        statusCode: 400,
      };
      return reply.code(400).send(error);
    }

    const supportedPairs = ["nl-en", "en-nl", "en-tr", "tr-en"];
    if (!supportedPairs.includes(`${sourceLang}-${targetLang}`)) {
      const error: ApiError = {
        error: "unsupported_language_pair",
        message: `'${sourceLang}-${targetLang}' is not supported. Supported: ${supportedPairs.join(", ")}`,
        statusCode: 400,
      };
      return reply.code(400).send(error);
    }

    req.log.info({ word, sourceLang, targetLang }, "lookup");

    try {
      const result = await lookupWord(word, sourceLang, targetLang);

      if (!result) {
        const error: ApiError = {
          error: "not_found",
          message: `No definition found for '${word}'`,
          statusCode: 404,
        };
        return reply.code(404).send(error);
      }

      return reply.code(200).send(result);
    } catch (err) {
      req.log.error(err, "lookup error");
      const error: ApiError = {
        error: "service_unavailable",
        message: "Dictionary service temporarily unavailable",
        statusCode: 503,
      };
      return reply.code(503).send(error);
    }
  });
}
