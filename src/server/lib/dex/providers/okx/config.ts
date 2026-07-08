export function okxApiUrl(): string {
  return process.env.OKX_API_URL?.trim() || "https://web3.okx.com";
}

export function okxCredentials(): {
  apiKey: string;
  apiSecret: string;
  passphrase: string;
} | null {
  const apiKey = process.env.OKX_API_KEY?.trim();
  const apiSecret = process.env.OKX_API_SECRET?.trim();
  const passphrase = process.env.OKX_API_PASSPHRASE?.trim();
  if (!apiKey || !apiSecret || !passphrase) return null;
  return { apiKey, apiSecret, passphrase };
}
