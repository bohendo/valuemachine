import { Logger } from "@valuemachine/types";

import { TransferCategories } from "../../../enums";
import { AddressBook, Transaction, Transfer } from "../../../types";
import { EvmMetadata, EvmTransaction } from "../../types";
import { insertVenue } from "../../../utils";
import { Apps } from "../../enums";
import { parseEvent } from "../../utils";

import {
  addresses,
  routerAddresses,
  airdropAddresses,
  stakingAddresses,
  v2MarketAddresses,
} from "./addresses";

const appName = Apps.UniswapV2;

////////////////////////////////////////
/// Abis

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
      && !isSelf(transfer.to)
      && (
        routerAddresses.some(e => transfer.to === e.address) ||
        v2MarketAddresses.some(e => transfer.to === e.address)
      )
    );
    const swapsIn = tx.transfers.filter((transfer: Transfer): boolean =>
      isSelf(transfer.to)
      && !isSelf(transfer.from)
      && (
        routerAddresses.some(e => transfer.from === e.address) ||
        v2MarketAddresses.some(e => transfer.from === e.address)
      )
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

    // Parse events
    let event;
    if (v2MarketAddresses.some(e => e.address === address)) {
      event = parseEvent(uniswapV2Abi, txLog, evmMeta);
    } else if (stakingAddresses.some(e => e.address === address)) {
      event = parseEvent(stakingAbi, txLog, evmMeta);
    } else if (airdropAddresses.some(e => e.address === address)) {
      event = parseEvent(airdropAbi, txLog, evmMeta);
    } else {
      log.debug(`Skipping ${getName(address)} event`);
      continue;
    }
    tx.apps.push(appName);

    ////////////////////////////////////////
    // Core Uniswap Interactions: swap, deposit liq, withdraw liq
    if ([
      "Swap", "Mint", "Burn",
    ].includes(event.name)) {
      const swaps = getSwaps();
      // log.info(swaps, `Got swaps:`);
      if (!swaps.in.length && !swaps.out.length) continue;
      if (!swaps.in.length || !swaps.out.length) {
        log.warn(`Missing ${appName} swaps: in=${swaps.in.length} out=${swaps.out.length}`);
        continue;
      }
      log.info(`Parsing ${appName} ${event.name}`);
      swaps.out.forEach(swap => {
        swap.category = TransferCategories.SwapOut;
        swap.to = address;
      });
      swaps.in.forEach(swap => {
        swap.category = swaps.out.some(swapOut => swapOut.asset === swap.asset)
          ? TransferCategories.Refund
          : TransferCategories.SwapIn;
        swap.from = address;
      });
      swaps.out.forEach(swap => { swap.index = "index" in swap ? swap.index : index; });
      swaps.in.forEach(swap => { swap.index = "index" in swap ? swap.index : index; });

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

    ////////////////////////////////////////
    // UNI Airdrop
    } else if (event.name === "Claimed") {
      tx.method = "UNI Claim";

    ////////////////////////////////////////
    // UNI Mining Pool Deposit
    } else if (event.name === "Staked") {
      const deposit = tx.transfers.find((transfer: Transfer): boolean =>
        isSelf(transfer.from)
        && !isSelf(transfer.to)
        && stakingAddresses.some(e => transfer.to === e.address)
        && v2MarketAddresses.some(e => getName(e.address) === transfer.asset)
      );
      if (!deposit) {
        log.warn(`${appName} ${event.name} couldn't find a deposit to ${address}`);
        continue;
      }
      log.info(`Parsing ${appName} ${event.name}`);
      const account = insertVenue(deposit.from, appName);
      deposit.category = TransferCategories.Internal;
      deposit.to = account;
      tx.method = "Deposit";

    ////////////////////////////////////////
    // UNI Mining Pool Withdraw
    } else if (event.name === "Withdrawn") {
      const withdraw = tx.transfers.find((transfer: Transfer): boolean =>
        isSelf(transfer.to)
        && !isSelf(transfer.from)
        && stakingAddresses.some(e => transfer.from === e.address)
        && v2MarketAddresses.some(e => getName(e.address) === transfer.asset)
      );
      if (!withdraw) {
        log.warn(`${appName} ${event.name} couldn't find a withdraw from staking pool}`);
        continue;
      }
      log.info(`Parsing ${appName} ${event.name}`);
      const account = insertVenue(withdraw.to, appName);
      withdraw.category = TransferCategories.Internal;
      withdraw.from = account;
      tx.method = "Withdraw";

    } else {
      log.debug(`Skipping ${appName} ${event.name}`);
    }
  }

  // log.debug(tx, `Done parsing ${appName}`);
  return tx;
};
