import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "./app-env";

function requestLine(c: Parameters<MiddlewareHandler<AppEnv>>[0]): string {
  const url = new URL(c.req.url);
  return `${c.req.method} ${url.pathname}${url.search}`;
}

/** Log API responses with status >= 400 to stdout (visible in Render logs). */
export const logApiErrors: MiddlewareHandler<AppEnv> = async (c, next) => {
  await next();

  const status = c.res.status;
  if (status < 400) return;

  console.warn(`[api] ${requestLine(c)} -> ${status}`);
};

/** Log uncaught handler errors before the default 500 response. */
export function logUnhandledError(err: unknown, c: Parameters<MiddlewareHandler<AppEnv>>[0]) {
  console.error(`[api] ${requestLine(c)} unhandled:`, err);
}
