import { formatUnits } from "@ethersproject/units";
import { Asset, Logger } from "@valuemachine/types";

import { TransferCategories } from "../../../enums";
import { AddressBook, Transaction } from "../../../types";
import { insertVenue } from "../../../utils";
import { Apps, Tokens } from "../../enums";
import { EvmMetadata, EvmTransaction } from "../../types";
import { parseEvent } from "../../utils";

import { coreAddresses, govAddresses, marketAddresses } from "./addresses";

const appName = Apps.Idle;

const { Internal, SwapIn, SwapOut } = TransferCategories;
const { IDLE } = Tokens;

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
  case Tokens.idleDAIv1: return Tokens.DAI;
  case Tokens.idleDAIYield: return Tokens.DAI;
  case Tokens.idleRAIYield: return Tokens.RAI;
  case Tokens.idleSUSDYield: return Tokens.sUSD;
  case Tokens.idleTUSDYield: return Tokens.TUSD;
  case Tokens.idleUSDCYield: return Tokens.USDC;
  case Tokens.idleUSDTYield: return Tokens.USDT;
  case Tokens.idleWBTCYield: return Tokens.WBTC;
  case Tokens.idleWETHYield: return Tokens.WETH;
  case Tokens.idleDAISafe: return Tokens.DAI;
  case Tokens.idleUSDCSafe: return Tokens.USDC;
  case Tokens.idleUSDTSafe: return Tokens.USDT;
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
  const log = logger.child({ name: `${appName}:${evmTx.hash.substring(0, 6)}` });
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
