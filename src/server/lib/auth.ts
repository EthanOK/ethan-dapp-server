import { type SignOptions } from "jsonwebtoken";
import jwt from "jsonwebtoken";
import { verifyMessage as verifyAmbireMessage } from "@ambire/signature-validator";
import { verifyMessage as verifyEthersMessage } from "ethers";
import { JWT_EXPIRES, JWT_SECRET } from "../config";
import { makeProvider } from "./provider";

export type LoginPayload = {
  message: string;
  signature: string;
};

export type SessionClaims = {
  address: string;
  nonce: string;
};

/** ERC-6492 magic — a wrapped smart-account signature ends with these 32 bytes. */
const ERC6492_MAGIC =
  "6492649264926492649264926492649264926492649264926492649264926492";

function isErc6492(signature: string): boolean {
  return signature.toLowerCase().endsWith(ERC6492_MAGIC);
}

function parseSiweFields(
  message: string,
): { address: string; nonce: string; chainId?: number } | null {
  const lines = message.split("\n");
  const address = lines[1]?.trim();
  const nonceLine = lines.find((line) => line.startsWith("Nonce: "));
  const nonce = nonceLine?.slice("Nonce: ".length).trim();
  const chainIdLine = lines.find((line) => line.startsWith("Chain ID: "));
  const chainId = Number(chainIdLine?.slice("Chain ID: ".length).trim());

  if (!address?.match(/^0x[a-fA-F0-9]{40}$/) || !nonce) {
    return null;
  }

  return { address, nonce, chainId: Number.isFinite(chainId) ? chainId : undefined };
}

/**
 * ERC-6492 signature verification via @ambire/signature-validator: one eth_call
 * to the deployless validator that simulates deployment and validates via
 * ERC-1271. Only used for wrapped smart-account signatures — plain EOA
 * signatures are verified locally with ethers verifyMessage (no RPC needed,
 * works on any chain including mainnet).
 */
async function verifyErc6492(
  message: string,
  signature: string,
  address: string,
  chainId: number,
): Promise<boolean> {
  const provider = makeProvider(chainId);
  try {
    // @ambire expects an ethers-v5 style Provider at runtime but only uses
    // provider.call({ data }) — ethers v6 JsonRpcProvider is compatible.
    return await verifyAmbireMessage({
      provider: provider as unknown as Parameters<typeof verifyAmbireMessage>[0]["provider"],
      signer: address,
      message,
      signature,
    });
  } catch (err) {
    console.warn("[auth] ERC-6492 verification failed:", err);
    return false;
  } finally {
    await provider.destroy();
  }
}

export async function verifySiweLogin(
  payload: LoginPayload,
): Promise<SessionClaims | null> {
  try {
    const fields = parseSiweFields(payload.message);
    if (!fields) {
      return null;
    }

    let isValid: boolean;
    if (isErc6492(payload.signature)) {
      // Wrapped smart-account signature → deployless eth_call validation.
      isValid =
        fields.chainId !== undefined &&
        (await verifyErc6492(
          payload.message,
          payload.signature,
          fields.address,
          fields.chainId,
        ));
    } else {
      // Plain EOA signature → local ecrecover, no RPC dependency.
      isValid =
        verifyEthersMessage(payload.message, payload.signature).toLowerCase() ===
        fields.address.toLowerCase();
    }

    if (!isValid) {
      return null;
    }

    return {
      address: fields.address,
      nonce: fields.nonce,
    };
  } catch (err) {
    console.error("[auth] verifySiweLogin failed:", err);
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
