import type { FastifyInstance } from "fastify";
import { LookupRequestSchema } from "@lexaflow/shared";
import type { ApiError } from "@lexaflow/shared";

export async function lookupRoutes(app: FastifyInstance) {
  app.get<{
    Querystring: { word: string; sourceLang: string; targetLang: string };
  }>("/api/lookup", async (req, reply) => {
    const start = Date.now();

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

    const langPair = `${sourceLang}-${targetLang}` as const;
    const supportedPairs = ["nl-en", "en-nl", "en-tr", "tr-en"];
    if (!supportedPairs.includes(langPair)) {
      const error: ApiError = {
        error: "unsupported_language_pair",
        message: `Language pair '${langPair}' is not supported`,
        statusCode: 400,
      };
      return reply.code(400).send(error);
    }

    // Sprint 2: real lookup service will be wired here
    // For now return a stub so the skeleton is testable
    req.log.info({ word, sourceLang, targetLang }, "lookup request");

    return reply.code(501).send({
      error: "not_implemented",
      message: "Dictionary engine will be available in Sprint 2",
      statusCode: 501,
    });
  });
}
