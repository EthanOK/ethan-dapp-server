import { Wallet, keccak256, randomBytes } from "ethers";
import { SiweMessage } from "siwe";

// Generated once per process — demo wallet for Swagger "Try it out" only.
const demoWallet = Wallet.createRandom();

export async function createDemoLoginPayload(origin: string) {
  const { host } = new URL(origin);

  const message = new SiweMessage({
    domain: host,
    address: demoWallet.address,
    statement: "Sign in to Ethan DApp",
    uri: origin,
    version: "1",
    chainId: 1,
    nonce: keccak256(randomBytes(32)).slice(2),
  });

  const prepared = message.prepareMessage();
  const signature = await demoWallet.signMessage(prepared);

  return { message: prepared, signature };
}
