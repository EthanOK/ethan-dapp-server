import { createHmac, timingSafeEqual } from "node:crypto";

export const SWAGGER_COOKIE_NAME = "swagger_access";
const SWAGGER_COOKIE_VALUE = "granted";
const SWAGGER_COOKIE_MAX_AGE = 60 * 60 * 24; // 24h

function swaggerPassword(): string {
  return process.env.SWAGGER_PASSWORD ?? "";
}

function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};
  return Object.fromEntries(
    header.split(";").map((part) => {
      const [key, ...rest] = part.trim().split("=");
      return [key, rest.join("=")];
    }),
  );
}

export function swaggerCookieToken(): string {
  const password = swaggerPassword();
  if (!password) return "";
  return createHmac("sha256", password)
    .update(SWAGGER_COOKIE_VALUE)
    .digest("hex");
}

export function isSwaggerGateEnabled(): boolean {
  return Boolean(swaggerPassword());
}

export function isSwaggerAuthorized(cookieHeader: string | undefined): boolean {
  if (!isSwaggerGateEnabled()) return true;

  const token = parseCookies(cookieHeader)[SWAGGER_COOKIE_NAME];
  if (!token) return false;

  const expected = swaggerCookieToken();
  if (token.length !== expected.length) return false;

  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function swaggerAuthCookieHeader(): string {
  const token = swaggerCookieToken();
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SWAGGER_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SWAGGER_COOKIE_MAX_AGE}${secure}`;
}

export function verifySwaggerPassword(password: string): boolean {
  const expected = swaggerPassword();
  if (!expected) return true;
  if (password.length !== expected.length) return false;

  try {
    return timingSafeEqual(Buffer.from(password), Buffer.from(expected));
  } catch {
    return false;
  }
}
