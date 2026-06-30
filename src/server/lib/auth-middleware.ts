import type { MiddlewareHandler } from "hono";
import { verifyToken } from "./auth";

export type AuthVariables = {
  userAddress: string;
};

export function parseAuthorizationHeader(
  header: string | undefined,
): string | null {
  if (!header?.trim()) {
    return null;
  }

  let value = header.trim();
  while (value.toLowerCase().startsWith("bearer ")) {
    value = value.slice(7).trim();
  }

  return value || null;
}

export const requireAuth: MiddlewareHandler<{
  Variables: AuthVariables;
}> = async (c, next) => {
  const token = parseAuthorizationHeader(c.req.header("Authorization"));

  if (!token) {
    return c.json(
      {
        code: -401,
        message:
          "Missing Authorization header. In Swagger Authorize, paste userToken from POST /api/login (with or without a Bearer prefix).",
      },
      401,
    );
  }

  const [address, message] = verifyToken(token);

  if (!address) {
    return c.json({ code: -401, message }, 401);
  }

  c.set("userAddress", address);
  await next();
};
