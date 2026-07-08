import { z } from "@hono/zod-openapi";

const okxResp = (required: boolean, description: string) =>
  required ? `[Required] ${description}` : `[Optional] ${description}`;

const OkxTokenInfoSchema = z
  .object({
    tokenContractAddress: z.string().openapi({
      description: okxResp(true, "Token contract address"),
    }),
    tokenSymbol: z.string().openapi({
      description: okxResp(true, "Token symbol"),
    }),
    tokenUnitPrice: z.string().nullable().optional().openapi({
      description: okxResp(false, "USD unit price (may be null)"),
    }),
    decimal: z.string().openapi({
      description: okxResp(true, "Token decimals"),
    }),
    isHoneyPot: z.boolean().optional().openapi({
      description: okxResp(false, "Whether token is a honeypot"),
    }),
    taxRate: z.string().optional().openapi({
      description: okxResp(false, "Buy/sell tax rate (0–1)"),
    }),
  })
  .passthrough()
  .openapi("OkxTokenInfo");

const OkxDexProtocolSchema = z
  .object({
    dexName: z.string().openapi({
      description: okxResp(true, "DEX protocol name"),
    }),
    percent: z.string().openapi({
      description: okxResp(true, "Share of routed amount on this protocol"),
    }),
  })
  .passthrough()
  .openapi("OkxDexProtocol");

const OkxDexRouterItemSchema = z
  .object({
    dexProtocol: OkxDexProtocolSchema,
    fromToken: OkxTokenInfoSchema,
    toToken: OkxTokenInfoSchema,
    fromTokenIndex: z.string().optional(),
    toTokenIndex: z.string().optional(),
  })
  .passthrough()
  .openapi("OkxDexRouterItem");

export const OkxQuoteDataSchema = z
  .object({
    chainIndex: z.string().openapi({
      description: okxResp(true, "Chain index"),
    }),
    dexRouterList: z.array(OkxDexRouterItemSchema).openapi({
      description: okxResp(true, "Route hops across DEX protocols"),
    }),
    fromTokenAmount: z.string().openapi({
      description: okxResp(true, "Input amount in smallest unit"),
    }),
    toTokenAmount: z.string().openapi({
      description: okxResp(true, "Expected output amount in smallest unit"),
    }),
    tradeFee: z.string().optional().openapi({
      description: okxResp(false, "Estimated network fee in USD"),
    }),
    estimateGasFee: z.string().optional().openapi({
      description: okxResp(false, "Estimated gas in chain-native units"),
    }),
    router: z.string().optional().openapi({
      description: okxResp(false, "Token path for the swap"),
    }),
    fromToken: OkxTokenInfoSchema,
    toToken: OkxTokenInfoSchema,
    swapMode: z.string().optional().openapi({
      example: "exactIn",
      description: okxResp(false, "Swap mode used for the quote"),
    }),
    priceImpactPercent: z.string().nullable().optional().openapi({
      description: okxResp(false, "Estimated price impact percent"),
    }),
  })
  .passthrough()
  .openapi("OkxQuoteData");

export const OkxQuoteResponseSchema = z
  .object({
    code: z.string().openapi({
      example: "0",
      description: okxResp(true, '"0" means success'),
    }),
    data: z.array(OkxQuoteDataSchema),
    msg: z.string().optional().openapi({ example: "" }),
  })
  .passthrough()
  .openapi("OkxQuoteResponse", {
    description:
      "OKX DEX aggregator quote response (`GET /api/v6/dex/aggregator/quote`).",
    example: {
      code: "0",
      data: [
        {
          chainIndex: "1",
          dexRouterList: [
            {
              dexProtocol: { dexName: "Uniswap V3", percent: "100" },
              fromToken: {
                tokenContractAddress:
                  "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
                tokenSymbol: "ETH",
                tokenUnitPrice: "4191.04",
                decimal: "18",
                isHoneyPot: false,
                taxRate: "0",
              },
              toToken: {
                tokenContractAddress:
                  "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
                tokenSymbol: "USDC",
                tokenUnitPrice: "0.999692",
                decimal: "6",
                isHoneyPot: false,
                taxRate: "0",
              },
            },
          ],
          fromTokenAmount: "10000000000000000000",
          toTokenAmount: "41910433",
          tradeFee: "0.01",
          estimateGasFee: "150000",
          router:
            "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee--0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
          swapMode: "exactIn",
          priceImpactPercent: "-0.12",
          fromToken: {
            tokenContractAddress: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
            tokenSymbol: "ETH",
            decimal: "18",
            isHoneyPot: false,
            taxRate: "0",
          },
          toToken: {
            tokenContractAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
            tokenSymbol: "USDC",
            decimal: "6",
            isHoneyPot: false,
            taxRate: "0",
          },
        },
      ],
      msg: "",
    },
  });

const OkxTxSchema = z
  .object({
    data: z.string().openapi({ description: okxResp(true, "Transaction calldata") }),
    from: z.string().openapi({ description: okxResp(true, "User wallet address") }),
    gas: z.string().optional().openapi({
      description: okxResp(false, "Estimated gas limit (decimal string)"),
    }),
    gasPrice: z.string().optional().openapi({
      description: okxResp(false, "Gas price in wei (decimal string)"),
    }),
    maxPriorityFeePerGas: z.string().optional().openapi({
      description: okxResp(false, "EIP-1559 maxPriorityFeePerGas (wei)"),
    }),
    to: z.string().openapi({
      description: okxResp(true, "OKX DEX router contract address"),
    }),
    value: z.string().openapi({
      description: okxResp(true, "Native value in wei (decimal string)"),
    }),
    maxSpendAmount: z.string().optional().openapi({
      description: okxResp(false, "ExactOut: max spend amount in smallest unit"),
    }),
    minReceiveAmount: z.string().optional().openapi({
      description: okxResp(false, "Min receive amount after slippage"),
    }),
    signatureData: z.array(z.string()).optional().openapi({
      description: okxResp(
        false,
        "Additional signature data (e.g. approve calldata or Jito tips calldata)",
      ),
    }),
    slippagePercent: z.string().optional().openapi({
      description: okxResp(false, "Applied slippage percent"),
    }),
  })
  .passthrough()
  .openapi("OkxSwapTx");

export const OkxSwapRouterResultSchema = z
  .object({
    chainIndex: z.string().optional(),
    dexRouterList: z.array(OkxDexRouterItemSchema).optional(),
    estimateGasFee: z.string().optional(),
    fromToken: OkxTokenInfoSchema.optional(),
    fromTokenAmount: z.string().optional(),
    priceImpactPercent: z.string().nullable().optional(),
    router: z.string().optional(),
    swapMode: z.string().optional(),
    toToken: OkxTokenInfoSchema.optional(),
    toTokenAmount: z.string().optional(),
    tradeFee: z.string().optional(),
  })
  .passthrough()
  .openapi("OkxSwapRouterResult", {
    description:
      "Swap router result; shape is similar to quote response but nested under routerResult.",
  });

export const OkxSwapDataSchema = z
  .object({
    routerResult: OkxSwapRouterResultSchema.openapi({
      description: okxResp(true, "Routing result object"),
    }),
    tx: OkxTxSchema.openapi({
      description: okxResp(true, "Transaction object for on-chain execution"),
    }),
  })
  .passthrough()
  .openapi("OkxSwapData");

export const OkxSwapResponseSchema = z
  .object({
    code: z.string().openapi({
      example: "0",
      description: okxResp(true, '"0" means success'),
    }),
    data: z.array(OkxSwapDataSchema),
    msg: z.string().optional().openapi({ example: "" }),
  })
  .passthrough()
  .openapi("OkxSwapResponse", {
    description:
      "OKX DEX aggregator swap response (`GET /api/v6/dex/aggregator/swap`). Includes `routerResult` and `tx` calldata.",
  });
