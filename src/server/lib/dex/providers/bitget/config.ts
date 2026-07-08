export function bitgetApiUrl(): string {
  return process.env.BITGET_API_URL?.trim() || "https://bopenapi.bgwapi.io";
}

export function bitgetCredentials(): { apiKey: string; apiSecret: string } | null {
  const apiKey = process.env.BITGET_API_KEY?.trim();
  const apiSecret = process.env.BITGET_API_SECRET?.trim();
  if (!apiKey || !apiSecret) return null;
  return { apiKey, apiSecret };
}
