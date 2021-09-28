import { formatUnits } from "@ethersproject/units";
import {
  AddressBook,
  Asset,
  EvmMetadata,
  EvmTransaction,
  Logger,
  Transaction,
  TransferCategories,
} from "@valuemachine/types";
import {
  insertVenue,
} from "@valuemachine/utils";

import { EvmAssets } from "../../enums";
import { parseEvent } from "../../utils";

import { coreAddresses, govAddresses, marketAddresses } from "./addresses";
import { apps } from "./enums";

export const appName = apps.Idle;

const { Internal, SwapIn, SwapOut } = TransferCategories;
const {
  IDLE, idleDAISafe, idleDAIYield, idleRAIYield, idleSUSDYield, idleTUSDYield,
  idleUSDCSafe, idleUSDCYield, idleUSDTSafe, idleUSDTYield, idleWBTCYield, idleWETHYield,
  DAI, RAI, sUSD, TUSD, USDC, USDT, WBTC, WETH,
} = EvmAssets;

////////////////////////////////////////
/// Abis

const stkIDLEAbi = [
  "event ApplyOwnership(address admin)",
  "event CommitOwnership(address admin)",
  "event Deposit(address indexed provider, uint256 value, uint256 indexed locktime, int128 type, uint256 ts)",
  "event Supply(uint256 prevSupply, uint256 supply)",
  "event Withdraw(address indexed provider, uint256 value, uint256 ts)",
];

////////////////////////////////////////
/// Parser

const idleToToken = (idleAsset: string): Asset | undefined => {
  switch (idleAsset) {
  case idleDAIYield: return DAI;
  case idleRAIYield: return RAI;
  case idleSUSDYield: return sUSD;
  case idleTUSDYield: return TUSD;
  case idleUSDCYield: return USDC;
  case idleUSDTYield: return USDT;
  case idleWBTCYield: return WBTC;
  case idleWETHYield: return WETH;
  case idleDAISafe: return DAI;
  case idleUSDCSafe: return USDC;
  case idleUSDTSafe: return USDT;
  default: return undefined;
  }
};

export const coreParser = (
  tx: Transaction,
  evmTx: EvmTransaction,
  evmMeta: EvmMetadata,
  addressBook: AddressBook,
  logger: Logger,
): Transaction => {
  const log = logger.child({ module: appName });
  const { isSelf } = addressBook;

  for (const txLog of evmTx.logs) {
    const address = txLog.address;
    const asset = addressBook.getName(address);

    ////////////////////
    // Stake/Unstake
    if (coreAddresses.some(e => e.address === address)) {
      tx.apps.push(appName);
      const name = addressBook.getName(address);
      if (name === "stkIDLE") {
        const event = parseEvent(stkIDLEAbi, txLog, evmMeta);
        const account = insertVenue(event.args?.provider, name);

        if (event.name === "Deposit") {
          const value = formatUnits(
            event.args.value,
            addressBook.getDecimals(govAddresses.find(e => e.name === IDLE).address),
          );
          log.info(`Found ${event.name} ${name} event for ${value} ${IDLE}`);
          const deposit = tx.transfers.find(transfer =>
            transfer.asset === IDLE && transfer.amount === value && isSelf(transfer.from)
          );
          if (deposit) {
            deposit.category = Internal;
            deposit.to = account;
            tx.method = "Stake";
          } else {
            log.warn(`Couldn't find an outgoing transfer of ${value} ${IDLE}`);
          }

        } else if (event.name === "Withdraw") {
          const value = formatUnits(
            event.args.value,
            addressBook.getDecimals(govAddresses.find(e => e.name === IDLE).address),
          );
          log.info(`Found ${event.name} ${name} event for ${value} ${IDLE}`);
          const withdraw = tx.transfers.find(transfer =>
            transfer.asset === IDLE && transfer.amount === value && isSelf(transfer.to)
          );
          if (withdraw) {
            withdraw.category = Internal;
            withdraw.from = account;
            tx.method = "Unstake";
          } else {
            log.warn(`Couldn't find an outgoing transfer of ${value} ${IDLE}`);
          }

        }
      }

    ////////////////////
    // Deposit/Withdraw
    } else if (marketAddresses.some(e => e.address === address)) {
      tx.apps.push(appName);
      log.info(`Found interaction with Idle ${addressBook.getName(address)}`);

      const underlyingAsset = idleToToken(addressBook.getName(address));

      log.info(`Looking for associated ${underlyingAsset} transfer`);
      const tokenTransfer = tx.transfers.find(transfer =>
        transfer.asset === underlyingAsset && (isSelf(transfer.from) || isSelf(transfer.to))
      );
      if (!tokenTransfer) {
        log.warn(`Couldn't find any ${underlyingAsset} transfer`);

      } else if (isSelf(tokenTransfer.to)) {
        const iTokenTransfer = tx.transfers.find(transfer =>
          transfer.asset === asset && isSelf(transfer.from)
        );
        if (iTokenTransfer) {
          tokenTransfer.category = SwapIn;
          iTokenTransfer.category = SwapOut;
          tx.method = "Withdrawal";
        } else {
          log.warn(`Couldn't find an outgoing ${asset} transfer`);
        }

      } else if (isSelf(tokenTransfer.from)) {
        const iTokenTransfer = tx.transfers.find(transfer =>
          transfer.asset === asset && isSelf(transfer.to)
        );
        if (iTokenTransfer) {
          tokenTransfer.category = SwapOut;
          iTokenTransfer.category = SwapIn;
          tx.method = "Deposit";
        } else {
          log.warn(`Couldn't find an outgoing ${asset} transfer`);
        }
      }
    }
  }

  return tx;
};

export const parsers = { insert: [], modify: [coreParser] };
