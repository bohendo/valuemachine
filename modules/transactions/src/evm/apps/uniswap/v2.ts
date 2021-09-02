import {
  AddressBook,
  EvmMetadata,
  EvmTransaction,
  Logger,
  Transaction,
  Transfer,
  TransferCategories,
} from "@valuemachine/types";
import {
  insertVenue,
} from "@valuemachine/utils";

import { parseEvent } from "../utils";

import {
  addresses,
  airdropAddresses,
  stakingAddresses,
  v1MarketAddresses,
  v2MarketAddresses,
} from "./addresses";

export const appName = "Uniswap";

const { Income, Expense, SwapIn, SwapOut, Internal } = TransferCategories;

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

const uniswapV2Abi = [
  "event Approval(address indexed owner, address indexed spender, uint256 value)",
  "event Burn(address indexed sender, uint256 amount0, uint256 amount1, address indexed to)",
  "event Mint(address indexed sender, uint256 amount0, uint256 amount1)",
  "event Swap(address indexed sender, uint256 amount0In, uint256 amount1In, uint256 amount0Out, uint256 amount1Out, address indexed to)",
  "event Sync(uint112 reserve0, uint112 reserve1)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
];

const stakingAbi = [
  "event RewardAdded(uint256 reward)",
  "event RewardPaid(address indexed user, uint256 reward)",
  "event Staked(address indexed user, uint256 amount)",
  "event Withdrawn(address indexed user, uint256 amount)",
];

const airdropAbi = [
  "event Claimed(uint256 index, address account, uint256 amount)",
];

////////////////////////////////////////
/// Parser

export const v2Parser = (
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
    if (v2MarketAddresses.some(e => e.address === address)) {
      subsrc = `${appName}V2`;
      event = parseEvent(uniswapV2Abi, txLog, evmMeta);
    } else if (v1MarketAddresses.some(e => e.address === address)) {
      subsrc = `${appName}V1`;
      event = parseEvent(uniswapV1Abi, txLog, evmMeta);
    } else if (stakingAddresses.some(e => e.address === address)) {
      subsrc = `${appName}V2`;
      event = parseEvent(stakingAbi, txLog, evmMeta);
    } else if (airdropAddresses.some(e => e.address === address)) {
      subsrc = `${appName}V2`;
      event = parseEvent(airdropAbi, txLog, evmMeta);
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

    ////////////////////////////////////////
    // UNI Airdrop
    } else if (event.name === "Claimed") {
      /*
      const airdrop = tx.transfers.find((transfer: Transfer): boolean =>
        airdropAddresses.some(e => transfer.from === e.address)
        && transfer.asset === UNI
        && transfer.category === Income
      );
      */
      tx.method = "Claim";

    ////////////////////////////////////////
    // UNI Mining Pool Deposit
    } else if (event.name === "Staked") {
      const deposit = tx.transfers.find((transfer: Transfer): boolean =>
        isSelf(transfer.from)
          && stakingAddresses.some(e => transfer.to === e.address)
          && v2MarketAddresses.some(e => getName(e.address) === transfer.asset)
          && ([Expense, Internal] as string[]).includes(transfer.category)
      );
      if (!deposit) {
        log.warn(`${subsrc} ${event.name} couldn't find a deposit to ${address}`);
        continue;
      }
      log.info(`Parsing ${subsrc} ${event.name}`);
      const account = insertVenue(deposit.from, appName);
      deposit.category = Internal;
      deposit.to = account;
      tx.method = "Deposit";

    ////////////////////////////////////////
    // UNI Mining Pool Withdraw
    } else if (event.name === "Withdrawn") {
      const withdraw = tx.transfers.find((transfer: Transfer): boolean =>
        isSelf(transfer.to)
          && stakingAddresses.some(e => transfer.from === e.address)
          && v2MarketAddresses.some(e => getName(e.address) === transfer.asset)
          && ([Income, Internal] as string[]).includes(transfer.category)
      );
      if (!withdraw) {
        log.warn(`${subsrc} ${event.name} couldn't find a withdraw from staking pool}`);
        continue;
      }
      log.info(`Parsing ${subsrc} ${event.name}`);
      const account = insertVenue(withdraw.to, appName);
      withdraw.category = Internal;
      withdraw.from = account;
      tx.method = "Withdraw";

    } else {
      log.debug(`Skipping ${subsrc} ${event.name}`);
    }
  }

  // log.debug(tx, `Done parsing ${appName}`);
  return tx;
};
