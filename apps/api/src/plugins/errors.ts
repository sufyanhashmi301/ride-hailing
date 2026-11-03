import type { FastifyError, FastifyInstance } from "fastify";

export interface ErrorEnvelope {
  error: {
    code: string;
    message: string;
    details: Record<string, unknown>;
    requestId: string;
  };
}

export function registerErrorHandler(app: FastifyInstance) {
  app.setNotFoundHandler((request, reply) => {
    const body: ErrorEnvelope = {
      error: {
        code: "NOT_FOUND",
        message: "Resource not found",
        details: {},
        requestId: request.id,
      },
    };
    reply.status(404).send(body);
  });

  app.setErrorHandler((error: FastifyError, request, reply) => {
    const statusCode = error.statusCode ?? 500;
    const isValidationError = error.code === "FST_ERR_VALIDATION";
    const code = isValidationError
      ? "VALIDATION_ERROR"
      : statusCode === 500
        ? "INTERNAL_ERROR"
        : (error.code ?? "ERROR");
    const details = isValidationError ? { issues: error.validation ?? [] } : readDetails(error);

    if (statusCode >= 500) {
      request.log.error({ err: error, requestId: request.id }, "unhandled error");
    } else {
      request.log.warn({ err: error, requestId: request.id }, "request error");
    }

    const body: ErrorEnvelope = {
      error: {
        code,
        message: statusCode >= 500 ? "Internal server error" : error.message,
        details,
        requestId: request.id,
      },
    };
    reply.status(statusCode).send(body);
  });
}

function readDetails(error: unknown): Record<string, unknown> {
  if (
    typeof error === "object" &&
    error !== null &&
    "details" in error &&
    typeof (error as { details?: unknown }).details === "object" &&
    (error as { details?: unknown }).details !== null
  ) {
    return (error as { details: Record<string, unknown> }).details;
  }
  return {};
}
