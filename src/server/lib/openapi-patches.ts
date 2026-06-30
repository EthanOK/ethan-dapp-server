import type { OpenAPIHono } from "@hono/zod-openapi";
import { patchLoginOpenApiExample } from "../routes/login";

export type OpenApiDoc = ReturnType<OpenAPIHono["getOpenAPIDocument"]>;

export type OpenApiPatch = (
  doc: OpenApiDoc,
  origin: string,
) => void | Promise<void>;

/** Register new Swagger Try-it-out patches here. */
const patches: OpenApiPatch[] = [patchLoginOpenApiExample];

export async function applyOpenApiPatches(
  doc: OpenApiDoc,
  origin: string,
): Promise<void> {
  for (const patch of patches) {
    await patch(doc, origin);
  }
}
