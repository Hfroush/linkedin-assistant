type LogMeta = Record<string, unknown>;

function serializeError(error: unknown): LogMeta {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    };
  }

  return { error };
}

export const logger = {
  info(message: string, meta: LogMeta = {}) {
    console.info(JSON.stringify({ level: "info", message, ...meta }));
  },
  warn(message: string, meta: LogMeta = {}) {
    console.warn(JSON.stringify({ level: "warn", message, ...meta }));
  },
  error(message: string, error: unknown, meta: LogMeta = {}) {
    console.error(JSON.stringify({ level: "error", message, ...serializeError(error), ...meta }));
  },
};
