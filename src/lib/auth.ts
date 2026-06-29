import { SiweMessage } from "siwe";
import jwt, { type SignOptions } from "jsonwebtoken";
import { JWT_EXPIRES, JWT_SECRET } from "../config";

export type LoginPayload = {
  message: string;
  signature: string;
};

export type SessionClaims = {
  address: string;
  nonce: string;
};

export async function verifySiweLogin(
  payload: LoginPayload,
): Promise<SessionClaims | null> {
  try {
    const siweMessage = new SiweMessage(payload.message);
    const { success, data } = await siweMessage.verify({
      signature: payload.signature,
    });

    if (!success) {
      return null;
    }

    return {
      address: data.address,
      nonce: data.nonce,
    };
  } catch {
    return null;
  }
}

export function generateToken(claims: SessionClaims): string {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET_KEY is not configured");
  }

  const options = { expiresIn: JWT_EXPIRES } as SignOptions;
  return jwt.sign(claims, JWT_SECRET, options);
}

export function verifyToken(
  userToken: string,
): [userAddress: string, message: string] | [null, string] {
  if (!JWT_SECRET) {
    return [null, "JWT_SECRET_KEY is not configured"];
  }

  try {
    const decoded = jwt.verify(userToken, JWT_SECRET) as SessionClaims;
    return [decoded.address, "verify success"];
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid token";
    return [null, message];
  }
}
