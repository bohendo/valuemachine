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
  v2MarketAddresses,
} from "./addresses";

export const appName = "Uniswap";

const { Income, Expense, Deposit, Withdraw } = TransferCategories;

////////////////////////////////////////
/// Abis

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

export const govParser = (
  tx: Transaction,
  evmTx: EvmTransaction,
  evmMeta: EvmMetadata,
  addressBook: AddressBook,
  logger: Logger,
): Transaction => {
  const log = logger.child({ module: `${appName}:${evmTx.hash.substring(0, 6)}` });
  const { getName, isSelf } = addressBook;

  for (const txLog of evmTx.logs.filter(
    l => addresses.some(e => e.address === l.address)
  )) {
    const address = txLog.address;
    tx.apps.push(appName);

    // Parse events
    let subsrc, event;
    if (stakingAddresses.some(e => e.address === address)) {
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
    // UNI Airdrop
    if (event.name === "Claimed") {
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
          && ([Expense, Deposit] as string[]).includes(transfer.category)
      );
      if (!deposit) {
        log.warn(`${subsrc} ${event.name} couldn't find a deposit to ${address}`);
        continue;
      }
      log.info(`Parsing ${subsrc} ${event.name}`);
      const account = insertVenue(deposit.from, appName);
      deposit.category = Deposit;
      deposit.to = account;
      tx.method = "Deposit";

    ////////////////////////////////////////
    // UNI Mining Pool Withdraw
    } else if (event.name === "Withdrawn") {
      const withdraw = tx.transfers.find((transfer: Transfer): boolean =>
        isSelf(transfer.to)
          && stakingAddresses.some(e => transfer.from === e.address)
          && v2MarketAddresses.some(e => getName(e.address) === transfer.asset)
          && ([Income, Withdraw] as string[]).includes(transfer.category)
      );
      if (!withdraw) {
        log.warn(`${subsrc} ${event.name} couldn't find a withdraw from staking pool}`);
        continue;
      }
      log.info(`Parsing ${subsrc} ${event.name}`);
      const account = insertVenue(withdraw.to, appName);
      withdraw.category = Withdraw;
      withdraw.from = account;
      tx.method = "Withdraw";

    } else {
      log.debug(`Skipping ${subsrc} ${event.name}`);
    }
  }

  // log.debug(tx, `Done parsing ${appName}`);
  return tx;
};
