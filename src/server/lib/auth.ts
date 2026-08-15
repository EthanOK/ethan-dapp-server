import { type SignOptions } from "jsonwebtoken";
import jwt from "jsonwebtoken";
import { verifyMessage as verifyAmbireMessage } from "@ambire/signature-validator";
import {
  type JsonRpcProvider,
  hashMessage,
  Interface,
  verifyMessage as verifyEthersMessage,
} from "ethers";
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

/** ERC-1271 `isValidSignature` success magic value. */
const ERC1271_MAGIC = "0x1626ba7e";

const ERC1271_IFACE = new Interface([
  "function isValidSignature(bytes32 hash, bytes signature) view returns (bytes4 magicValue)",
]);

type SiweFields = {
  address: string;
  nonce: string;
  chainId?: number;
};

function isERC6492(signature: string): boolean {
  return signature.toLowerCase().endsWith(ERC6492_MAGIC);
}

function parseSiweFields(message: string): SiweFields | null {
  const lines = message.split("\n");
  const address = lines[1]?.trim();
  const nonceLine = lines.find((line) => line.startsWith("Nonce: "));
  const nonce = nonceLine?.slice("Nonce: ".length).trim();
  const chainIdLine = lines.find((line) => line.startsWith("Chain ID: "));
  const chainId = Number(chainIdLine?.slice("Chain ID: ".length).trim());

  if (!address?.match(/^0x[a-fA-F0-9]{40}$/) || !nonce) {
    return null;
  }

  return {
    address,
    nonce,
    chainId: Number.isFinite(chainId) ? chainId : undefined,
  };
}

/** Run `fn` with an RPC provider for `chainId`, always destroying it afterwards. */
async function withProvider<T>(
  chainId: number,
  fn: (provider: JsonRpcProvider) => Promise<T>,
): Promise<T> {
  const provider = makeProvider(chainId);
  try {
    return await fn(provider);
  } finally {
    await provider.destroy();
  }
}

/**
 * ERC-6492 wrapped smart-account signature → @ambire/signature-validator
 * deployless eth_call (validates via ERC-1271, simulating deployment first).
 */
async function verifyERC6492(
  message: string,
  signature: string,
  address: string,
  chainId: number,
): Promise<boolean> {
  try {
    return await withProvider(chainId, (provider) =>
      verifyAmbireMessage({
        // @ambire expects an ethers-v5 style Provider at runtime but only calls
        // provider.call({ data }) — ethers v6 JsonRpcProvider is compatible.
        provider:
          provider as unknown as Parameters<typeof verifyAmbireMessage>[0]["provider"],
        signer: address,
        message,
        signature,
      }),
    );
  } catch (err) {
    console.warn("[auth] ERC-6492 verification failed:", err);
    return false;
  }
}

/**
 * ERC-1271 smart-contract signature (Safe, Kernel, any Reown/AppKit smart
 * account): one eth_call to `isValidSignature(bytes32,bytes)`. Used as a
 * fallback when local ecrecover fails — such accounts sign with the owner key,
 * so the recovered address is the owner, not the account, and some emit
 * non-standard `v` values that ethers rejects.
 */
async function verifyERC1271(
  message: string,
  signature: string,
  address: string,
  chainId: number,
): Promise<boolean> {
  try {
    return await withProvider(chainId, async (provider) => {
      const digest = hashMessage(message);
      const data = ERC1271_IFACE.encodeFunctionData("isValidSignature", [
        digest,
        signature,
      ]);
      const result = await provider.call({ to: address, data });
      const [magic] = ERC1271_IFACE.decodeFunctionResult(
        "isValidSignature",
        result,
      ) as unknown as [string];
      return magic.toLowerCase() === ERC1271_MAGIC;
    });
  } catch (err) {
    console.warn("[auth] ERC-1271 verification failed:", err);
    return false;
  }
}

/** Local ecrecover; returns the signer address, or null if malformed. */
function recoverSigner(message: string, signature: string): string | null {
  try {
    return verifyEthersMessage(message, signature);
  } catch {
    return null;
  }
}

/**
 * EOA first (local ecrecover, no RPC), then ERC-1271 fallback for smart
 * accounts (needs a chainId to reach the network).
 */
async function verifyEOAOrERC1271(
  message: string,
  signature: string,
  address: string,
  chainId?: number,
): Promise<boolean> {
  if (
    recoverSigner(message, signature)?.toLowerCase() === address.toLowerCase()
  ) {
    return true;
  }
  return (
    chainId !== undefined &&
    (await verifyERC1271(message, signature, address, chainId))
  );
}

export async function verifySiweLogin(
  payload: LoginPayload,
): Promise<SessionClaims | null> {
  try {
    const fields = parseSiweFields(payload.message);
    if (!fields) {
      return null;
    }

    const { message, signature } = payload;
    const { address, nonce, chainId } = fields;

    const isValid = isERC6492(signature)
      ? chainId !== undefined &&
        (await verifyERC6492(message, signature, address, chainId))
      : await verifyEOAOrERC1271(message, signature, address, chainId);

    return isValid ? { address, nonce } : null;
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
