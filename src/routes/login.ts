import type { Context } from "hono";
import { generateToken, verifySiweLogin } from "../lib/auth";

type LoginBody = {
  message: string;
  signature: string;
};

export async function handleLogin(c: Context) {
  const body = (await c.req.json()) as LoginBody;
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
}
