import {
  AddressBook,
  EvmMetadata,
  EvmTransaction,
  Logger,
  Transaction,
  Transfer,
  TransferCategories,
} from "@valuemachine/types";

import { parseEvent } from "../utils";

import {
  addresses,
  v1MarketAddresses,
} from "./addresses";

export const appName = "Uniswap";

const { Income, Expense, SwapIn, SwapOut } = TransferCategories;

////////////////////////////////////////
/// Abis

const uniswapV1Abi = [
  "event AddLiquidity(address indexed provider, uint256 indexed eth_amount, uint256 indexed token_amount)",
  "event Approval(address indexed _owner, address indexed _spender, uint256 _value)",
  "event EthPurchase(address indexed buyer, uint256 indexed tokens_sold, uint256 indexed eth_bought)",
  "event RemoveLiquidity(address indexed provider, uint256 indexed eth_amount, uint256 indexed token_amount)",
  "event TokenPurchase(address indexed buyer, uint256 indexed eth_sold, uint256 indexed tokens_bought)",
  "event Transfer(address indexed _from, address indexed _to, uint256 _value)",
];

////////////////////////////////////////
/// Parser

export const v1Parser = (
  tx: Transaction,
  evmTx: EvmTransaction,
  evmMeta: EvmMetadata,
  addressBook: AddressBook,
  logger: Logger,
): Transaction => {
  const log = logger.child({ module: `${appName}:${evmTx.hash.substring(0, 6)}` });
  const { getName, isSelf } = addressBook;

  const getSwaps = () => {
    const swapsOut = tx.transfers.filter((transfer: Transfer): boolean =>
      isSelf(transfer.from)
        && addresses.some(e => transfer.to === e.address)
        && ([Expense, SwapOut] as string[]).includes(transfer.category)
    );
    const swapsIn = tx.transfers.filter((transfer: Transfer): boolean =>
      isSelf(transfer.to)
        && addresses.some(e => transfer.from === e.address)
        && ([Income, SwapIn] as string[]).includes(transfer.category)
    );
    // SwapIn entries for assets that don't exist in swapsOut should come first
    const ofType = asset => swap => swap.asset === asset;
    swapsIn.sort((s1, s2) =>
      swapsOut.filter(ofType(s1.asset)).length - swapsOut.filter(ofType(s2.asset)).length
    );
    return { in: swapsIn, out: swapsOut };
  };

  for (const txLog of evmTx.logs.filter(
    l => addresses.some(e => e.address === l.address)
  )) {
    const address = txLog.address;
    const index = txLog.index || 1;
    tx.apps.push(appName);

    // Parse events
    let subsrc, event;
    if (v1MarketAddresses.some(e => e.address === address)) {
      subsrc = `${appName}V1`;
      event = parseEvent(uniswapV1Abi, txLog, evmMeta);
    } else {
      log.debug(`Skipping ${getName(address)} event`);
      continue;
    }

    ////////////////////////////////////////
    // Core Uniswap Interactions: swap, deposit liq, withdraw liq
    if ([
      "EthPurchase", "TokenPurchase", "AddLiquidity", "RemoveLiquidity", // V1
      "Swap", "Mint", "Burn", // V2
    ].includes(event.name)) {
      const swaps = getSwaps();
      if (!swaps.in.length || !swaps.out.length) {
        log.warn(`Missing ${subsrc} swaps: in=${swaps.in.length} out=${swaps.out.length}`);
        continue;
      }
      log.info(`Parsing ${subsrc} ${event.name}`);
      swaps.in.forEach(swap => {
        swap.category = SwapIn;
        swap.from = address;
      });
      swaps.out.forEach(swap => {
        swap.category = SwapOut;
        swap.to = address;
      });
      swaps.in.forEach(swap => { swap.index = swap.index || index; });
      swaps.out.forEach(swap => { swap.index = swap.index || index; });

      ////////////////////////////////////////
      // Swaps
      if (["Swap", "EthPurchase", "TokenPurchase"].includes(event.name)) {
        tx.method = "Trade";

      ////////////////////////////////////////
      // Deposit Liquidity
      } else if (["Mint", "AddLiquidity"].includes(event.name)) {
        tx.method = "Supply Liquidity";

      ////////////////////////////////////////
      // Withdraw Liquidity
      } else if (["Burn", "RemoveLiquidity"].includes(event.name)) {
        tx.method = "Remove Liquidity";

      } else {
        log.warn(`Missing ${event.name} swaps: in=${swaps.in.length} out=${swaps.out.length}`);
      }

    } else {
      log.debug(`Skipping ${subsrc} ${event.name}`);
    }
  }

  // log.debug(tx, `Done parsing ${appName}`);
  return tx;
};
