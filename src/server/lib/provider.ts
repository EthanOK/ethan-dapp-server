import { AlchemyProvider, JsonRpcProvider } from "ethers";
import { ALCHEMY_API_KEY } from "../config";

/**
 * Provider selection for on-chain operations (signature validation, EIP-7702
 * relaying):
 *  - No ALCHEMY_API_KEY → public RPCs below.
 *  - hoodi (560048): ethers' AlchemyProvider has no hoodi entry (checked 6.17
 *    and the latest release), so its Alchemy URL is built manually.
 *  - else (sepolia): let ethers build the Alchemy URL via AlchemyProvider.
 */
const DEFAULT_RPCS: Record<number, string> = {
  1: "https://0xrpc.io/eth",         
  11155111: "https://0xrpc.io/sep",
  560048: "https://0xrpc.io/hoodi",
};

export function makeProvider(chainId: number): JsonRpcProvider {
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
