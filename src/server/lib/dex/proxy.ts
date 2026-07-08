import type { RouteConfig } from "@hono/zod-openapi";
import type { OpenAPIHono } from "@hono/zod-openapi";
import type { Context } from "hono";
import type { z } from "@hono/zod-openapi";
import type { AppEnv } from "../app-env";
import { DexProviderNotConfiguredError } from "./errors";
import { passthroughUpstreamResponse } from "./passthrough";

export type DexUpstreamPost = (
  apiPath: string,
  payload: unknown,
) => Promise<Response>;

export async function handleDexProxy(
  c: Context<AppEnv>,
  options: {
    provider: string;
    upstreamPath: string;
    bodySchema: z.ZodTypeAny;
    post: DexUpstreamPost;
  },
): Promise<Response> {
  const payload = options.bodySchema.parse(await c.req.json());

  try {
    const upstream = await options.post(options.upstreamPath, payload);
    return passthroughUpstreamResponse(upstream);
  } catch (err) {
    if (err instanceof DexProviderNotConfiguredError) {
      return c.json({ code: -503 as const, message: err.message }, 503);
    }

    const message =
      err instanceof Error
        ? err.message
        : `Failed to reach ${options.provider} API`;
    return c.json({ code: 502 as const, message }, 502);
  }
}

/** Register a transparent DEX aggregator proxy route (OpenAPI + passthrough). */
export function registerDexProxyRoute(
  app: OpenAPIHono<AppEnv>,
  route: RouteConfig,
  options: {
    provider: string;
    upstreamPath: string;
    bodySchema: z.ZodTypeAny;
    post: DexUpstreamPost;
  },
): void {
  app.openapi(route, (async (c: Context<AppEnv>) =>
    handleDexProxy(c, options)) as never);
}
