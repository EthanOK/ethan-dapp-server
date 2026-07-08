import { z } from "@hono/zod-openapi";

const okxField = (required: boolean, description: string) =>
  required ? `[Required] ${description}` : `[Optional] ${description}`;

const okxTokenAddress = (required: boolean, role: "Source" | "Target") =>
  z.string().openapi({
    example:
      role === "Source"
        ? "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
        : "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    description: okxField(
      required,
      `${role} token contract address; use 0xeeee…eeee for native token`,
    ),
  });

const okxBooleanQuery = (description: string) =>
  z
    .enum(["true", "false"])
    .optional()
    .openapi({ description: okxField(false, description) });

export const OkxQuoteQuerySchema = z
  .object({
    chainIndex: z.string().openapi({
      example: "1",
      description: okxField(true, "Chain index (e.g. 1 = Ethereum)"),
    }),
    amount: z.string().openapi({
      example: "10000000000000000000",
      description: okxField(
        true,
        "Amount in smallest token unit; exactIn = sell amount, exactOut = buy amount",
      ),
    }),
    swapMode: z.enum(["exactIn", "exactOut"]).optional().openapi({
      example: "exactIn",
      description: okxField(
        false,
        'Swap mode; default exactIn. exactOut only on select chains/protocols',
      ),
    }),
    fromTokenAddress: okxTokenAddress(true, "Source"),
    toTokenAddress: okxTokenAddress(true, "Target"),
    dexIds: z.string().optional().openapi({
      description: okxField(false, "Limit quote to dexIds, comma-separated"),
    }),
    excludeDexIds: z.string().optional().openapi({
      description: okxField(
        false,
        "Exclude dexIds from routing, comma-separated",
      ),
    }),
    forJitoBundle: okxBooleanQuery(
      "When true, exclude DEXes incompatible with Jito bundles",
    ),
    excludePoolAddresses: z.string().optional().openapi({
      description: okxField(
        false,
        "Exclude pool addresses, comma-separated (max 20)",
      ),
    }),
    directRoute: okxBooleanQuery(
      "Restrict routing to a single pool (Solana only)",
    ),
    singleRouteOnly: okxBooleanQuery(
      "Single path only; multi-hop allowed, no parallel split routes",
    ),
    singlePoolPerHop: okxBooleanQuery("At most one pool per hop"),
    assetAwareRouting: okxBooleanQuery(
      "Constrain routes by asset type (U-U and U-Native only)",
    ),
    priceImpactProtectionPercent: z.string().optional().openapi({
      example: "90",
      description: okxField(
        false,
        "Max allowed price impact percent (0–100); default 90; 100 disables",
      ),
    }),
    feePercent: z.string().optional().openapi({
      description: okxField(
        false,
        "Fee share percent sent to commission address",
      ),
    }),
  })
  .passthrough()
  .openapi("OkxDexAggregatorQuoteQuery", {
    description:
      "Required: chainIndex, amount, fromTokenAddress, toTokenAddress. Optional query fields are forwarded to OKX when present.",
    example: {
      chainIndex: "1",
      amount: "10000000000000000000",
      fromTokenAddress: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      toTokenAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      swapMode: "exactIn",
    },
  });

export const OkxSwapQuerySchema = z
  .object({
    chainIndex: z.string().openapi({
      example: "1",
      description: okxField(true, "Chain index (e.g. 1 = Ethereum)"),
    }),
    amount: z.string().openapi({
      example: "100000000",
      description: okxField(
        true,
        "Amount in smallest token unit; exactIn = sell amount, exactOut = buy amount",
      ),
    }),
    swapMode: z.enum(["exactIn", "exactOut"]).optional().openapi({
      example: "exactIn",
      description: okxField(
        false,
        'Swap mode; default exactIn. exactOut only on select chains/protocols',
      ),
    }),
    fromTokenAddress: okxTokenAddress(true, "Source"),
    toTokenAddress: okxTokenAddress(true, "Target"),
    slippagePercent: z.string().openapi({
      example: "0.5",
      description: okxField(true, "Slippage tolerance in percent (e.g. 0.5)"),
    }),
    userWalletAddress: z.string().openapi({
      example: "0x3f6a3f57569358a512ccc0e513f171516b0fd42a",
      description: okxField(true, "User wallet address"),
    }),

    approveTransaction: okxBooleanQuery(
      "When true, return approve contract + calldata in signatureData",
    ),
    approveAmount: z.string().optional().openapi({
      description: okxField(false, "Approve amount in smallest unit"),
    }),
    swapReceiverAddress: z.string().optional().openapi({
      description: okxField(
        false,
        "Receiver of purchased asset; defaults to userWalletAddress",
      ),
    }),
    feePercent: z.string().optional().openapi({
      description: okxField(
        false,
        "Fee share percent; use with referrer address",
      ),
    }),
    fromTokenReferrerWalletAddress: z.string().optional().openapi({
      description: okxField(false, "Commission address charged in fromToken"),
    }),
    toTokenReferrerWalletAddress: z.string().optional().openapi({
      description: okxField(false, "Commission address charged in toToken"),
    }),

    gaslimit: z.string().optional().openapi({
      description: okxField(false, "Gas limit cap in wei (EVM only)"),
    }),
    gasLevel: z.enum(["average", "fast", "slow"]).optional().openapi({
      description: okxField(false, "Gas price level; default average"),
    }),

    directRoute: okxBooleanQuery(
      "Enable direct route / single pool mode (Solana and EVM supported)",
    ),
    singleRouteOnly: okxBooleanQuery(
      "Single path only; multi-hop allowed, no parallel split routes",
    ),
    singlePoolPerHop: okxBooleanQuery("At most one pool per hop"),
    assetAwareRouting: okxBooleanQuery(
      "Constrain routes by asset type (U-U and U-Native only)",
    ),
    callDataMemo: z.string().optional().openapi({
      description: okxField(
        false,
        "Custom calldata memo hex string (64 bytes / 128 hex chars) with 0x prefix",
      ),
    }),

    computeUnitPrice: z.string().optional().openapi({
      description: okxField(false, "Solana: compute unit price"),
    }),
    computeUnitLimit: z.string().optional().openapi({
      description: okxField(false, "Solana: compute unit limit"),
    }),
    tips: z.string().optional().openapi({
      description: okxField(false, "Solana: Jito tips in SOL"),
    }),
    forJitoBundle: okxBooleanQuery(
      "When true, exclude DEXes incompatible with Jito bundles",
    ),

    dexIds: z.string().optional().openapi({
      description: okxField(false, "Limit to dexIds, comma-separated"),
    }),
    excludeDexIds: z.string().optional().openapi({
      description: okxField(false, "Exclude dexIds, comma-separated"),
    }),
    excludePoolAddresses: z.string().optional().openapi({
      description: okxField(
        false,
        "Exclude pool addresses, comma-separated (max 20)",
      ),
    }),

    disableRFQ: okxBooleanQuery("Disable RFQ liquidity sources"),
    priceImpactProtectionPercent: z.string().optional().openapi({
      example: "90",
      description: okxField(
        false,
        "Max allowed price impact percent (0–100); default 90; 100 disables",
      ),
    }),
    autoSlippage: okxBooleanQuery("Enable auto slippage"),
    maxAutoslippagePercent: z.string().optional().openapi({
      description: okxField(
        false,
        "When autoSlippage is true, cap auto slippage percent",
      ),
    }),
    maxCalldataSize: z.string().optional().openapi({
      description: okxField(false, "Max calldata size estimate for routing"),
    }),
    maxAccounts: z.string().optional().openapi({
      description: okxField(false, "Max accounts estimate for routing"),
    }),
    contextSlot: z.string().optional().openapi({
      description: okxField(false, "Solana: simulate swap at the given slot"),
    }),
  })
  .passthrough()
  .openapi("OkxDexAggregatorSwapQuery", {
    description:
      "Required: chainIndex, amount, fromTokenAddress, toTokenAddress, slippagePercent, userWalletAddress. Optional query fields are forwarded to OKX when present.",
    example: {
      chainIndex: "1",
      amount: "100000000",
      fromTokenAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      toTokenAddress: "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599",
      slippagePercent: "0.1",
      userWalletAddress: "0x77660f108043c9e300b4e30a35a61dd19f5ae28a",
      approveTransaction: "true",
      approveAmount: "10000000",
      swapMode: "exactIn",
    },
  });
