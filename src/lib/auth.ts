import { type SignOptions } from "jsonwebtoken";
import jwt from "jsonwebtoken";
import { JWT_EXPIRES, JWT_SECRET } from "../config";

export type LoginPayload = {
  message: string;
  signature: string;
};

export type SessionClaims = {
  address: string;
  nonce: string;
};

function parseSiweFields(
  message: string,
): { address: string; nonce: string } | null {
  const lines = message.split("\n");
  const address = lines[1]?.trim();
  const nonceLine = lines.find((line) => line.startsWith("Nonce: "));
  const nonce = nonceLine?.slice("Nonce: ".length).trim();

  if (!address?.match(/^0x[a-fA-F0-9]{40}$/) || !nonce) {
    return null;
  }

  return { address, nonce };
}

export async function verifySiweLogin(
  payload: LoginPayload,
): Promise<SessionClaims | null> {
  try {
    const fields = parseSiweFields(payload.message);
    if (!fields) {
      return null;
    }

    const { verifyMessage } = await import("ethers");
    const recovered = verifyMessage(payload.message, payload.signature);

    if (recovered.toLowerCase() !== fields.address.toLowerCase()) {
      return null;
    }

    return {
      address: fields.address,
      nonce: fields.nonce,
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
