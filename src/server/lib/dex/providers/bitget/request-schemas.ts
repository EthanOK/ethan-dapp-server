import { z } from "@hono/zod-openapi";

const bitgetField = (required: boolean, description: string) =>
  required ? `[Required] ${description}` : `[Optional] ${description}`;

const bitgetTokenContract = (required: boolean, role: "Source" | "Target") =>
  z.string().openapi({
    example:
      role === "Source"
        ? "0xdAC17F958D2ee523a2206206994597C13D831ec7"
        : "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    description: bitgetField(
      required,
      `${role} token contract address; use empty string for native token`,
    ),
  });

const bitgetChain = (required: boolean) =>
  z.string().openapi({
    example: "eth",
    description: bitgetField(
      required,
      "Chain identifier (e.g. eth, bnb, sol)",
    ),
  });

const bitgetAmount = (required: boolean) =>
  z.string().openapi({
    example: "100",
    description: bitgetField(
      required,
      'Amount in token units (e.g. "100" means 100 tokens)',
    ),
  });

const bitgetWalletAddress = (required: boolean, role: "Debit" | "Recipient") =>
  z.string().openapi({
    example: "0xd8FeBD1C242a282f1b8226d34282942F6F63248b",
    description: bitgetField(required, `${role} wallet address`),
  });

export const BitgetQuoteBodySchema = z
  .object({
    fromSymbol: z.string().optional().openapi({
      example: "USDT",
      description: bitgetField(false, "Source token symbol"),
    }),
    fromContract: bitgetTokenContract(true, "Source"),
    fromAmount: bitgetAmount(true),
    fromChain: bitgetChain(true),
    toSymbol: z.string().optional().openapi({
      example: "USDC",
      description: bitgetField(false, "Target token symbol"),
    }),
    toContract: bitgetTokenContract(true, "Target"),
    toChain: bitgetChain(true),
    fromAddress: bitgetWalletAddress(false, "Debit").optional(),
    toAddress: bitgetWalletAddress(false, "Recipient").optional(),
    txOrigin: z.string().optional().openapi({
      description: bitgetField(
        false,
        "Transaction origin for RFQ routing; defaults to fromAddress when omitted",
      ),
    }),
    estimateGas: z.boolean().optional().openapi({
      example: true,
      description: bitgetField(
        false,
        "Whether to estimate gas; default false; use together with fromAddress",
      ),
    }),
    market: z.string().optional().openapi({
      description: bitgetField(
        false,
        "Quote channel (e.g. uniswap.v3); all supported markets when omitted",
      ),
    }),
    feeRate: z.number().optional().openapi({
      description: bitgetField(
        false,
        "Fee rate in per mille (‰); 0 for no fee; valid range 0.001–0.2 when non-zero",
      ),
    }),
    solMaxAccounts: z.string().optional().openapi({
      description: bitgetField(false, "Max accounts; SOL chain only"),
    }),
    skipCache: z.boolean().optional().openapi({
      description: bitgetField(false, "Skip quote cache when true"),
    }),
  })
  .passthrough()
  .openapi("BitgetDexAggregatorQuoteBody", {
    description:
      "Required: fromContract, fromAmount, fromChain, toContract, toChain. All other fields are optional and forwarded to Bitget when present.",
    example: {
      fromSymbol: "USDT",
      fromContract: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      fromAmount: "100",
      fromChain: "eth",
      toSymbol: "USDC",
      toContract: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      toChain: "eth",
      fromAddress: "0xd8FeBD1C242a282f1b8226d34282942F6F63248b",
      estimateGas: true,
    },
  });

export const BitgetSwapBodySchema = z
  .object({
    fromSymbol: z.string().optional().openapi({
      example: "USDT",
      description: bitgetField(false, "Source token symbol"),
    }),
    fromContract: bitgetTokenContract(true, "Source"),
    fromAmount: bitgetAmount(true),
    fromChain: bitgetChain(true),
    toSymbol: z.string().optional().openapi({
      example: "USDC",
      description: bitgetField(false, "Target token symbol"),
    }),
    toContract: bitgetTokenContract(true, "Target"),
    toChain: bitgetChain(true),
    fromAddress: bitgetWalletAddress(true, "Debit"),
    toAddress: bitgetWalletAddress(true, "Recipient"),
    market: z.string().openapi({
      example: "bgwaggregator",
      description: bitgetField(
        true,
        "Best market from the quote API response",
      ),
    }),
    txOrigin: z.string().optional().openapi({
      description: bitgetField(
        false,
        "Transaction origin for RFQ routing; defaults to fromAddress when omitted",
      ),
    }),
    slippage: z.number().optional().openapi({
      example: 1,
      description: bitgetField(
        false,
        "Slippage tolerance in percent (1 means 1%); defaults to recommended value",
      ),
    }),
    feeRate: z.number().optional().openapi({
      description: bitgetField(
        false,
        "Fee rate in per mille (‰); 0 for no fee; valid range 0.001–0.2 when non-zero",
      ),
    }),
    executorAddress: z.string().optional().openapi({
      description: bitgetField(
        false,
        "Executor contract address when the tx is not sent from fromAddress",
      ),
    }),
    solMaxAccounts: z.string().optional().openapi({
      description: bitgetField(false, "Max accounts; SOL chain only"),
    }),
    feePayer: z.string().optional().openapi({
      description: bitgetField(
        false,
        "Fee payer for SOL account creation; defaults to fromAddress",
      ),
    }),
    deadline: z.number().optional().openapi({
      description: bitgetField(
        false,
        "Order expiry in seconds; eth default 300, others 120; max 600",
      ),
    }),
    protocols: z.string().optional().openapi({
      description: bitgetField(false, "Protocol list; all supported when omitted"),
    }),
    requestMod: z.enum(["simple", "rich"]).optional().openapi({
      example: "rich",
      description: bitgetField(false, 'Response mode: "simple" or "rich"'),
    }),
  })
  .passthrough()
  .openapi("BitgetDexAggregatorSwapBody", {
    description:
      "Required: fromContract, fromAmount, fromChain, toContract, toChain, fromAddress, toAddress, market. All other fields are optional and forwarded to Bitget when present.",
    example: {
      fromSymbol: "USDT",
      fromContract: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      fromAmount: "100",
      fromChain: "eth",
      toSymbol: "USDC",
      toContract: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      toChain: "eth",
      fromAddress: "0xd8FeBD1C242a282f1b8226d34282942F6F63248b",
      toAddress: "0xd8FeBD1C242a282f1b8226d34282942F6F63248b",
      slippage: 1,
      market: "bgwaggregator",
      requestMod: "rich",
    },
  });
