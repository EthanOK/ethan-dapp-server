import { AlchemyProvider, JsonRpcProvider, Wallet } from "ethers";
import { ALCHEMY_API_KEY, RELAYER_PRIVATE_KEY } from "../config";

export type RelayAuthorization = {
  chainId: number;
  address: string;
  nonce: number;
  yParity: number | string;
  r: string;
  s: string;
};

export type RelayRequest = {
  chainId: number;
  to: string;
  authorizationList: RelayAuthorization[];
};

export type RelayResult = {
  txHash: string;
  from: string;
};

/** Only testnets are supported: the relayer must never spend mainnet gas. */
const SUPPORTED_CHAIN_IDS: number[] = [11155111, 560048]; // sepolia, hoodi

/**
 * Provider selection:
 *  - No ALCHEMY_API_KEY → public RPCs below.
 *  - hoodi (560048): ethers' AlchemyProvider has no hoodi entry (checked 6.17
 *    and the latest release), so its Alchemy URL is built manually.
 *  - else (sepolia): let ethers build the Alchemy URL via AlchemyProvider.
 */
const DEFAULT_RPCS: Record<number, string> = {
  11155111: "https://0xrpc.io/sep",
  560048: "https://0xrpc.io/hoodi",
};

function makeProvider(chainId: number): JsonRpcProvider {
  if (!ALCHEMY_API_KEY) {
    const rpc = DEFAULT_RPCS[chainId];
    if (!rpc) {
      throw new Error(`No RPC configured for chainId ${chainId}`);
    }
    return new JsonRpcProvider(rpc, chainId, { staticNetwork: true });
  }
  if (chainId === 560048) {
    return new JsonRpcProvider(
      `https://eth-hoodi.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      chainId,
      { staticNetwork: true }
    );
  }
  return new AlchemyProvider(chainId, ALCHEMY_API_KEY);
}

/**
 * EIP-7702 gas sponsorship: broadcast a type-4 transaction whose sender is the
 * relayer account (it pays the gas). The authorization inside was signed by the
 * dapp's private-key wallet, so the delegation is applied to that EOA while the
 * relayer covers the fee.
 */
export async function relayEIP7702(req: RelayRequest): Promise<RelayResult> {
  if (!SUPPORTED_CHAIN_IDS.includes(req.chainId)) {
    throw new Error(
      `Relay only supports testnets (sepolia/hoodi); chainId ${req.chainId} is not allowed`,
    );
  }
  const relayerKey = RELAYER_PRIVATE_KEY;
  if (!relayerKey) {
    throw new Error("RELAYER_PRIVATE_KEY is not configured");
  }

  const provider = makeProvider(req.chainId);
  const relayer = new Wallet(relayerKey, provider);
  const from = await relayer.getAddress();

  const authorizationList = req.authorizationList.map((a) => ({
    chainId: a.chainId,
    address: a.address,
    nonce: a.nonce,
    signature: { r: a.r, s: a.s, yParity: Number(a.yParity) as 0 | 1 },
  }));

  const tx = await relayer.sendTransaction({
    type: 4,
    to: req.to,
    chainId: req.chainId,
    authorizationList,
  });

  return { txHash: tx.hash, from };
}
