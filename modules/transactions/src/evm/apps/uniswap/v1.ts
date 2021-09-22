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

import { apps } from "./enums";
import {
  addresses,
  v1MarketAddresses,
} from "./addresses";

export const appName = apps.UniswapV1;

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
      && !isSelf(transfer.to)
      && addresses.some(e => transfer.to === e.address)
    );
    const swapsIn = tx.transfers.filter((transfer: Transfer): boolean =>
      isSelf(transfer.to)
      && !isSelf(transfer.from)
      && addresses.some(e => transfer.from === e.address)
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
    let event;
    if (v1MarketAddresses.some(e => e.address === address)) {
      event = parseEvent(uniswapV1Abi, txLog, evmMeta);
    } else {
      log.debug(`Skipping ${getName(address)} event`);
      continue;
    }

    ////////////////////////////////////////
    // Core Uniswap Interactions: swap, deposit liq, withdraw liq
    if ([
      "EthPurchase", "TokenPurchase", "AddLiquidity", "RemoveLiquidity",
    ].includes(event.name)) {
      log.info(`Parsing ${appName} ${event.name}`);
      const swaps = getSwaps();
      if (!swaps.in.length && !swaps.out.length) continue;
      if (!swaps.in.length || !swaps.out.length) {
        log.warn(`Missing ${appName} swaps: in=${swaps.in.length} out=${swaps.out.length}`);
        continue;
      }
      swaps.in.forEach(swap => {
        swap.category = TransferCategories.SwapIn;
        swap.from = address;
      });
      swaps.out.forEach(swap => {
        swap.category = TransferCategories.SwapOut;
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
      }

    } else {
      log.debug(`Skipping ${appName} ${event.name}`);
    }
  }

  // log.debug(tx, `Done parsing ${appName}`);
  return tx;
};
