import type { OpenAPIHono } from "@hono/zod-openapi";
import type { AppEnv } from "../../lib/app-env";

/**
 * OKX DEX aggregator routes (`/api/okx/dex/aggregator/*`).
 *
 * Add provider modules under `src/server/lib/dex/providers/okx/`:
 * - config.ts       — OKX_API_URL, credentials from env
 * - client.ts       — signing + authenticated POST
 * - request-schemas.ts — Zod request bodies for OpenAPI
 * - openapi-schemas.ts — Zod response schemas from OKX docs
 *
 * Then register quote/swap routes here via `registerDexProxyRoute`.
 */
export function registerOkxDexRoutes(_app: OpenAPIHono<AppEnv>): void {
  // Intentionally empty until OKX integration is implemented.
}
