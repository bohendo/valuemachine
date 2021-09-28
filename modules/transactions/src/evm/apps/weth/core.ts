import { formatUnits } from "@ethersproject/units";
import {
  AddressBook,
  EvmMetadata,
  EvmTransaction,
  Logger,
  Transaction,
  TransferCategories,
} from "@valuemachine/types";

import { parseEvent } from "../utils";

import { assets, apps } from "./enums";
import {
  wethAddress,
  wmaticAddress,
} from "./addresses";

const wethAbi = [
  "event Approval(address indexed src, address indexed guy, uint256 wad)",
  "event Deposit(address indexed dst, uint256 wad)",
  "event Transfer(address indexed src, address indexed dst, uint256 wad)",
  "event Withdrawal(address indexed src, uint256 wad)",
];

export const coreParser = (
  tx: Transaction,
  evmTx: EvmTransaction,
  evmMeta: EvmMetadata,
  addressBook: AddressBook,
  logger: Logger,
): Transaction => {
  const { getDecimals, isSelf } = addressBook;
  const log = logger.child({ module: `${apps.Weth}:${evmTx.hash.substring(0, 6)}` });

  for (const txLog of evmTx.logs) {
    const address = txLog.address;
    log.info(`checking address ${address} aka ${addressBook.getName(address)}`);
    if (address === wethAddress || address === wmaticAddress) {
      const appName = address === wethAddress ? apps.Weth : apps.WMatic;
      const asset = address === wethAddress ? assets.WETH : assets.WMATIC;
      log.info(`Found ${appName} event`);
      const event = parseEvent(wethAbi, txLog, evmMeta);
      if (!event.name) continue;
      const amount = formatUnits(event.args.wad, getDecimals(address));
      const index = txLog.index || 1;

      if (event.name === "Deposit") {
        if (!isSelf(event.args.dst)) {
          log.debug(`Skipping ${asset} ${event.name} that doesn't involve us`);
          continue;
        } else {
          log.info(`Parsing ${appName} ${event.name} of amount ${amount}`);
        }
        tx.apps.push(appName);
        tx.transfers.push({
          asset,
          category: TransferCategories.SwapIn,
          from: address,
          index,
          amount: amount,
          to: event.args.dst,
        });
        const swapOut = tx.transfers.find(t =>
          t.asset === evmMeta.feeAsset && t.amount === amount
          && isSelf(t.from) && t.to === address
        );
        if (swapOut) {
          swapOut.category = TransferCategories.SwapOut;
          swapOut.index = index - 0.1;
          if (evmTx.to === wethAddress || evmTx.to === wmaticAddress) {
            tx.method = "Trade";
          }
          // If there's a same-value eth transfer to the swap recipient, index it before
          const transfer = tx.transfers.find(t =>
            t.asset === evmMeta.feeAsset && t.amount === amount
            && t.to === swapOut.from
          );
          if (transfer) {
            transfer.index = index - 0.2;
          }
        } else {
          log.warn(`Couldn't find an eth call associated w deposit of ${amount} ${asset}`);
        }

      } else if (event.name === "Withdrawal") {
        if (!isSelf(event.args.src)) {
          log.debug(`Skipping ${asset} ${event.name} that doesn't involve us`);
          continue;
        } else {
          log.info(`Parsing ${appName} ${event.name} of amount ${amount}`);
        }
        tx.apps.push(appName);
        tx.transfers.push({
          asset,
          category: TransferCategories.SwapOut,
          from: event.args.src,
          index,
          amount: amount,
          to: address,
        });
        const swapIn = tx.transfers.find(t =>
          t.asset === evmMeta.feeAsset && t.amount === amount
          && isSelf(t.to) && t.from === address
        );
        if (swapIn) {
          swapIn.category = TransferCategories.SwapIn;
          swapIn.index = index + 0.1;
          if (evmTx.to === wethAddress) {
            tx.method = "Trade";
          }
          // If there's a same-value eth transfer from the swap recipient, index it after
          const transfer = tx.transfers.find(t =>
            t.asset === evmMeta.feeAsset && t.amount === amount
            && t.from === swapIn.to
          );
          if (transfer) {
            transfer.index = index + 0.2;
          }
        } else {
          log.warn(`Couldn't find an eth call associated w withdrawal of ${amount} ${asset}`);
        }

      } else if (event.name === "Transfer" || event.name === "Approval") {
        log.debug(`Skipping ${appName} ${event.name} that was already processed`);
      } else {
        log.warn(`Unknown ${appName} event`);
      }

    }
  }

  return tx;
};
