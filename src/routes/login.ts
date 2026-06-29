import { createRoute, type OpenAPIHono, z } from "@hono/zod-openapi";
import { generateToken, verifySiweLogin } from "../lib/auth";

const LoginBodySchema = z
  .object({
    message: z
      .string()
      .openapi({
        example:
          "localhost wants you to sign in with your Ethereum account:\n0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0\n\nSign in to Ethan DApp\n\nURI: http://localhost:3000\nVersion: 1\nChain ID: 1\nNonce: abc123\nIssued At: 2026-01-01T00:00:00.000Z",
      }),
    signature: z.string().openapi({ example: "0x..." }),
  })
  .openapi("LoginBody");

const LoginSuccessSchema = z
  .object({
    code: z.literal(200).openapi({ example: 200 }),
    data: z.object({
      userToken: z
        .string()
        .openapi({ example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }),
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
    message: z.string().openapi({ example: "JWT_SECRET_KEY is not configured" }),
  })
  .openapi("LoginServerError");

const loginRoute = createRoute({
  method: "post",
  path: "/api/login",
  tags: ["Auth"],
  summary: "Wallet login (SIWE)",
  description:
    "Verify a Sign-In with Ethereum (EIP-4361) message and return JWT userToken. Body: JSON.stringify({ message, signature })",
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

export function registerLoginRoutes(app: OpenAPIHono) {
  app.openapi(loginRoute, async (c) => {
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
