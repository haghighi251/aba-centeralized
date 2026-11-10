import pino from "pino";

/**
 * Structured logger for the application.
 * Redacts sensitive fields so you never accidentally log credentials or tokens.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: [
    "password",
    "credentials.password",
    "body.password",
    "req.headers.authorization",
    "token",
    "accessToken",
    "refreshToken",
    "data.tokens",
  ],
});