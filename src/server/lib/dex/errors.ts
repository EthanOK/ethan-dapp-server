/** Thrown when a DEX provider's server-side credentials are missing. */
export class DexProviderNotConfiguredError extends Error {
  constructor(public readonly provider: string) {
    super(`${provider} API credentials are not configured`);
    this.name = "DexProviderNotConfiguredError";
  }
}
