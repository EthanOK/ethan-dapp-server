import { createRoute, type OpenAPIHono, z } from "@hono/zod-openapi";
import type { AppEnv } from "../lib/app-env";
import { createDemoLoginPayload } from "../lib/demo-login";

const LoginBodySchema = z
  .object({
    message: z.string().openapi({
      description: "EIP-4361 SIWE message string",
    }),
    signature: z.string().openapi({
      description: "Wallet signature for the message",
    }),
  })
  .openapi("LoginBody");

const LoginSuccessSchema = z
  .object({
    code: z.literal(200).openapi({ example: 200 }),
    data: z.object({
      userToken: z.string().openapi({
        example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        description:
          "JWT for protected routes. In Swagger: Authorize → paste this value only (no Bearer prefix).",
      }),
    }),
  })
  .openapi("LoginSuccess");

const LoginUnauthorizedSchema = z
  .object({
    code: z.literal(-444).openapi({ example: -444 }),
    message: z.string().openapi({ example: "Invalid signature" }),
  })
  .openapi("LoginUnauthorized");

const LoginServerErrorSchema = z
  .object({
    code: z.literal(500).openapi({ example: 500 }),
    message: z
      .string()
      .openapi({ example: "JWT_SECRET_KEY is not configured" }),
  })
  .openapi("LoginServerError");

const loginRoute = createRoute({
  method: "post",
  path: "/api/login",
  tags: ["Auth"],
  summary: "Wallet login (SIWE)",
  description:
    "Verify a Sign-In with Ethereum (EIP-4361) message and return JWT userToken. Try it out pre-fills a valid demo payload for the current host; you may edit message and signature.",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: LoginBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Login success",
      content: {
        "application/json": {
          schema: LoginSuccessSchema,
        },
      },
    },
    401: {
      description: "Invalid signature",
      content: {
        "application/json": {
          schema: LoginUnauthorizedSchema,
        },
      },
    },
    500: {
      description: "Server misconfiguration",
      content: {
        "application/json": {
          schema: LoginServerErrorSchema,
        },
      },
    },
  },
});

export function registerLoginRoutes(app: OpenAPIHono<AppEnv>) {
  app.openapi(loginRoute, async (c) => {
    const { generateToken, verifySiweLogin } = await import("../lib/auth");
    const body = c.req.valid("json");
    const session = await verifySiweLogin(body);

    if (!session) {
      return c.json({ code: -444, message: "Invalid signature" }, 401);
    }

    try {
      const userToken = generateToken(session);
      return c.json({ code: 200, data: { userToken } }, 200);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      return c.json({ code: 500, message }, 500);
    }
  });
}

type OpenApiDoc = ReturnType<OpenAPIHono["getOpenAPIDocument"]>;

export async function patchLoginOpenApiExample(
  doc: OpenApiDoc,
  origin: string,
) {
  const example = await createDemoLoginPayload(origin);
  const loginPath = doc.paths?.["/api/login"]?.post;
  const requestBody = loginPath?.requestBody;
  if (!requestBody || !("content" in requestBody)) {
    return;
  }

  const jsonBody = requestBody.content?.["application/json"];
  if (!jsonBody) {
    return;
  }

  // Swagger "Try it out" default body — user can still edit before Execute.
  jsonBody.example = example;

  const loginBody = doc.components?.schemas?.LoginBody as
    { properties?: Record<string, { example?: string }> } | undefined;

  if (loginBody?.properties?.message) {
    loginBody.properties.message.example = example.message;
  }
  if (loginBody?.properties?.signature) {
    loginBody.properties.signature.example = example.signature;
  }
}
