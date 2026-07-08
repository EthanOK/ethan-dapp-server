import type { OpenAPIHono } from "@hono/zod-openapi";
import type { AppEnv } from "../../lib/app-env";
import { registerBitgetDexRoutes } from "./bitget";
import { registerOkxDexRoutes } from "./okx";

/** Register all DEX aggregator provider routes (Bitget, OKX, …). */
export function registerDexRoutes(app: OpenAPIHono<AppEnv>): void {
  registerBitgetDexRoutes(app);
  registerOkxDexRoutes(app);
}
