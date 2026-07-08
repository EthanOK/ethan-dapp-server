import { z } from "@hono/zod-openapi";

const bitgetResp = (required: boolean, description: string) =>
  required ? `[Required] ${description}` : `[Optional] ${description}`;

const BitgetSwapRoutePathItemSchema = z
  .object({
    pool_addr: z.string().openapi({
      description: bitgetResp(true, "Pool address"),
    }),
    label: z.string().openapi({
      description: bitgetResp(true, "DEX label"),
    }),
    from_contract: z.string().openapi({
      description: bitgetResp(true, "Source token contract in this hop"),
    }),
    to_contract: z.string().openapi({
      description: bitgetResp(true, "Target token contract in this hop"),
    }),
    from_amount: z.string().openapi({
      description: bitgetResp(true, "Input amount in smallest unit"),
    }),
    to_amount: z.string().openapi({
      description: bitgetResp(true, "Output amount in smallest unit"),
    }),
    percent: z.number().openapi({
      description: bitgetResp(true, "Route share percent"),
    }),
    from_decimal: z.number().openapi({
      description: bitgetResp(true, "Source token decimals"),
    }),
    to_decimal: z.number().openapi({
      description: bitgetResp(true, "Target token decimals"),
    }),
    block_height: z.string().openapi({
      description: bitgetResp(true, "Block height"),
    }),
  })
  .openapi("BitgetSwapRoutePathItem");

const BitgetSwapGasFeeInfoItemSchema = z
  .object({
    type: z.string().openapi({ example: "basic" }),
    amount: z.string(),
    amountUSD: z.string(),
  })
  .openapi("BitgetSwapGasFeeInfoItem");

const BitgetSwapGasLevelSchema = z
  .object({
    gasPrice: z.string(),
    weiDecimals: z.number().optional(),
    gasLimit: z.string(),
    baseFee: z.string().optional(),
    priorityFee: z.string().optional(),
    maxFeePerGas: z.string().optional(),
    SupportEIP1559: z.boolean().optional(),
    gasFeeRate: z.string().optional(),
    info: z.array(BitgetSwapGasFeeInfoItemSchema).optional(),
  })
  .passthrough()
  .openapi("BitgetSwapGasLevel");

const BitgetSwapGasFeeSchema = z
  .object({
    gasLimit: z.string().openapi({
      description: bitgetResp(true, "Gas limit"),
    }),
    gasPrice: z.string().openapi({
      description: bitgetResp(true, "Gas price"),
    }),
    gasFeeAmountInUsd: z.string().optional(),
    gasTotalAmount: z.string().optional(),
    gasLevel: z.string().optional().openapi({ example: "fast" }),
    gasLevelInfos: z
      .object({
        average: BitgetSwapGasLevelSchema.optional(),
        fast: BitgetSwapGasLevelSchema.optional(),
        slow: BitgetSwapGasLevelSchema.optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough()
  .openapi("BitgetSwapGasFee");

const BitgetSwapFeeSchema = z
  .object({
    swapType: z.number(),
    feeType: z.number(),
    feeRate: z.string(),
    feeChain: z.string(),
    feeSymbol: z.string(),
    feeContract: z.string(),
    feeDecimals: z.number(),
    feeTokenPrice: z.string(),
    feeDueAmount: z.string(),
  })
  .passthrough()
  .openapi("BitgetSwapFee");

const BitgetSwapTransactionSchema = z
  .object({
    chain: z.string().openapi({ example: "eth" }),
    symbol: z.string().openapi({ example: "USDT" }),
    contract: z.string(),
    from: z.string(),
    to: z.string().openapi({
      description: bitgetResp(true, "Router/aggregator contract to call"),
    }),
    receiver: z.string(),
    data: z.string().openapi({
      description: bitgetResp(true, "Transaction calldata (EVM rich mode)"),
    }),
    value: z.string().openapi({ example: "0" }),
    gasAmount: z.string().optional(),
    gasAmountUsd: z.string().optional(),
    gasPrice: z.string().optional(),
  })
  .passthrough()
  .openapi("BitgetSwapTransaction");

const BitgetSolInstructionAccountSchema = z
  .object({
    pubkey: z.string(),
    isSigner: z.boolean(),
    isWritable: z.boolean(),
  })
  .openapi("BitgetSolInstructionAccount");

const BitgetSolInstructionSchema = z
  .object({
    programId: z.string(),
    accounts: z.array(BitgetSolInstructionAccountSchema),
    data: z.string(),
  })
  .openapi("BitgetSolInstruction");

/** Swap `data` object per Bitget instruction-mode docs (simple, rich, and SOL variants). */
export const BitgetSwapDataSchema = z
  .object({
    id: z.string().openapi({
      example: "d640efc6a85b49948b87eba4df82ead6",
      description: bitgetResp(true, "Order ID"),
    }),
    market: z.string().openapi({
      example: "bgwaggregator",
      description: bitgetResp(true, "Market/channel name"),
    }),
    contract: z.string().optional().openapi({
      example: "0x6D0034c7DA87e8f0526b21aa890d40A77C755B68",
      description: bitgetResp(false, "Router contract address (EVM simple mode)"),
    }),
    calldata: z.string().optional().openapi({
      description: bitgetResp(
        false,
        "Transaction calldata (EVM simple mode); SOL returns serialized tx",
      ),
    }),
    deadline: z.number().openapi({
      example: 300,
      description: bitgetResp(true, "Order timeout in seconds"),
    }),
    computeUnits: z.number().optional().openapi({
      description: bitgetResp(false, "SOL compute units"),
    }),
    addressLookupTableAccount: z
      .array(z.string())
      .optional()
      .openapi({
        description: bitgetResp(
          false,
          "SOL Address Lookup Table pubkeys for Versioned Transaction",
        ),
      }),
    instructionLists: z
      .array(BitgetSolInstructionSchema)
      .optional()
      .openapi({
        description: bitgetResp(false, "SOL instruction list for assembling tx"),
      }),
    outAmount: z.string().optional().openapi({
      example: "99.954005",
      description: bitgetResp(false, "Expected output amount (rich mode)"),
    }),
    minAmount: z.string().optional().openapi({
      example: "98.954464",
      description: bitgetResp(false, "Minimum output after slippage (rich mode)"),
    }),
    slippage: z.string().optional().openapi({
      example: "1.00",
      description: bitgetResp(false, "Applied slippage percent (rich mode)"),
    }),
    recommendSlippage: z.string().optional().openapi({
      example: "0.50",
      description: bitgetResp(false, "Recommended slippage (rich mode)"),
    }),
    priceImpact: z.string().optional().openapi({
      example: "0.001",
      description: bitgetResp(false, "Price impact (rich mode)"),
    }),
    fromTokenPrice: z.string().optional(),
    toTokenPrice: z.string().optional(),
    predeductAmount: z.string().optional(),
    postdeductAmount: z.string().optional(),
    routePath: z.array(BitgetSwapRoutePathItemSchema).optional().openapi({
      description: bitgetResp(false, "Route hops (rich mode)"),
    }),
    gasFee: BitgetSwapGasFeeSchema.optional().openapi({
      description: bitgetResp(false, "Gas fee breakdown (rich mode)"),
    }),
    swapFee: BitgetSwapFeeSchema.optional().openapi({
      description: bitgetResp(false, "Swap fee breakdown (rich mode)"),
    }),
    swapTransaction: BitgetSwapTransactionSchema.optional().openapi({
      description: bitgetResp(
        false,
        "Ready-to-sign EVM transaction fields (rich mode)",
      ),
    }),
  })
  .passthrough()
  .openapi("BitgetSwapData");

/** Top-level Bitget swap API response (`POST /bgw-pro/swapx/pro/swap`). */
export const BitgetSwapResponseSchema = z
  .object({
    status: z.number().openapi({
      example: 0,
      description: bitgetResp(true, "0 means success"),
    }),
    error_code: z.number().optional().openapi({ example: 0 }),
    data: BitgetSwapDataSchema,
    msg: z.string().optional().openapi({ example: "success" }),
    title: z.string().optional().openapi({ example: "" }),
    timestamp: z.number().optional(),
    trace: z.string().optional(),
  })
  .passthrough()
  .openapi("BitgetSwapResponse", {
    description:
      "Bitget instruction-mode swap response. Simple mode returns `calldata`/`contract`; rich mode (`requestMod=rich`) adds `routePath`, `gasFee`, `swapTransaction`, etc.; SOL adds `instructionLists`.",
    example: {
      status: 0,
      error_code: 0,
      data: {
        id: "d640efc6a85b49948b87eba4df82ead6",
        market: "bgwaggregator",
        deadline: 300,
        outAmount: "99.954005",
        minAmount: "98.954464",
        slippage: "1.00",
        recommendSlippage: "0.50",
        priceImpact: "0.001",
        fromTokenPrice: "1",
        toTokenPrice: "1.0006901392402954",
        predeductAmount: "0",
        postdeductAmount: "0",
        routePath: [
          {
            pool_addr: "0x4eceeb5adaa1cabd56451c1f1ea82b33effb6de62097a19734936f574e9a2de2",
            label: "UniswapV4",
            from_contract: "0xdac17f958d2ee523a2206206994597c13d831ec7",
            to_contract: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
            from_amount: "100000000",
            to_amount: "99954005",
            percent: 100,
            from_decimal: 6,
            to_decimal: 6,
            block_height: "25487182",
          },
        ],
        swapTransaction: {
          chain: "eth",
          symbol: "USDT",
          contract: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
          from: "0xd8FeBD1C242a282f1b8226d34282942F6F63248b",
          to: "0xBc1D9760bd6ca468CA9fB5Ff2CFbEAC35d86c973",
          receiver: "0xd8FeBD1C242a282f1b8226d34282942F6F63248b",
          data: "0xd984396a...",
          value: "0",
          gasAmount: "1520000",
          gasAmountUsd: "0.553242155017967083883544",
          gasPrice: "0.0000000002098113",
        },
      },
      msg: "success",
      title: "",
      timestamp: 1783505671220,
      trace: "Self=1-6a4e2307-...",
    },
  });

/** Quote `data` object per Bitget instruction-mode docs. */
export const BitgetQuoteDataSchema = z
  .object({
    toAmount: z.string().openapi({
      example: "99.954005",
      description: bitgetResp(
        true,
        "Expected output amount in token units",
      ),
    }),
    market: z.string().openapi({
      example: "bgwaggregator",
      description: bitgetResp(
        true,
        "Best market/channel; pass to swap API as `market`",
      ),
    }),
    estimateRevert: z.boolean().openapi({
      example: false,
      description: bitgetResp(
        true,
        "Whether the swap is estimated to revert on-chain",
      ),
    }),
    slippage: z.string().openapi({
      example: "0.5",
      description: bitgetResp(true, "Recommended slippage"),
    }),
    computeUnits: z.number().optional().openapi({
      example: 650000,
      description: bitgetResp(false, "SOL chain compute unit estimate"),
    }),
    gasLimit: z.number().optional().openapi({
      example: 1073280,
      description: bitgetResp(
        false,
        "Estimated gas limit; present when estimateGas is true",
      ),
    }),
  })
  .passthrough()
  .openapi("BitgetQuoteData", {
    description:
      "Required: toAmount, market, estimateRevert, slippage. Optional: computeUnits (SOL), gasLimit (when estimateGas requested).",
  });

/** Top-level Bitget quote API response (`POST /bgw-pro/swapx/pro/quote`). */
export const BitgetQuoteResponseSchema = z
  .object({
    status: z.number().openapi({
      example: 0,
      description: bitgetResp(true, "0 means success"),
    }),
    error_code: z.number().optional().openapi({ example: 0 }),
    data: BitgetQuoteDataSchema,
    msg: z.string().optional().openapi({ example: "success" }),
    title: z.string().optional().openapi({ example: "" }),
    timestamp: z.number().optional(),
    trace: z.string().optional(),
  })
  .passthrough()
  .openapi("BitgetQuoteResponse", {
    description:
      "Bitget instruction-mode quote response. Use `data.market` when calling swap.",
    example: {
      status: 0,
      error_code: 0,
      data: {
        toAmount: "99.954005",
        market: "bgwaggregator",
        slippage: "0.5",
        estimateRevert: false,
        gasLimit: 1073280,
        computeUnits: 650000,
      },
      msg: "success",
      title: "",
      timestamp: 1783505670581,
      trace: "Self=1-6a4e2306-...",
    },
  });
