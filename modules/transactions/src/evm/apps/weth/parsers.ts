import { formatUnits } from "@ethersproject/units";
import {
  AddressBook,
  EvmMetadata,
  EvmTransaction,
  Logger,
  Transaction,
  TransferCategories,
} from "@valuemachine/types";

import { Tokens, Apps } from "../../enums";
import { getTransferCategory, parseEvent } from "../../utils";

import {
  gatewayAddress,
  wethAddress,
  wmaticAddress,
} from "./addresses";

const { SwapIn, SwapOut, Noop } = TransferCategories;

const wethAbi = [
  "event Approval(address indexed src, address indexed guy, uint256 wad)",
  "event Deposit(address indexed dst, uint256 wad)",
  "event Transfer(address indexed src, address indexed dst, uint256 wad)",
  "event Withdrawal(address indexed src, uint256 wad)",
];

const coreParser = (
  tx: Transaction,
  evmTx: EvmTransaction,
  evmMeta: EvmMetadata,
  addressBook: AddressBook,
  logger: Logger,
): Transaction => {
  const { getDecimals } = addressBook;
  const log = logger.child({ module: `${Apps.Weth}:${evmTx.hash.substring(0, 6)}` });
  const isProxy = address => gatewayAddress === address;
  const isSelf = address => addressBook.isSelf(address) || isProxy(address);

  // If we sent this evmTx to a proxy, replace proxy addresses w tx origin
  if (addressBook.isSelf(evmTx.from)) {
    tx.transfers.forEach(transfer => {
      if (isProxy(transfer.from)) {
        transfer.from = evmTx.from;
        transfer.category = getTransferCategory(transfer.from, transfer.to, addressBook);
      }
      if (isProxy(transfer.to)) {
        transfer.to = evmTx.from;
        transfer.category = getTransferCategory(transfer.from, transfer.to, addressBook);
      }
    });
  }

  const replaceProxy = addressBook.isSelf(evmTx.from)
    ? address => address === gatewayAddress ? evmTx.from : address
    : address => address;

  for (const txLog of evmTx.logs) {
    const address = txLog.address;
    const index = txLog.index;
    if (address === wethAddress || address === wmaticAddress) {
      const appName = address === wethAddress ? Apps.Weth : Apps.WMatic;
      const asset = address === wethAddress ? Tokens.WETH : Tokens.WMATIC;
      const event = parseEvent(wethAbi, txLog, evmMeta);
      if (!event.name) continue;
      const amount = formatUnits(event.args.wad, getDecimals(address));

      if (event.name === "Deposit") {
        log.info(`Parsing ${appName} ${event.name} of amount ${amount}`);
        tx.apps.push(appName);
        const to = replaceProxy(event.args.dst);
        tx.transfers.push({
          asset,
          category: isSelf(to) ? SwapIn : Noop,
          from: address,
          index,
          amount: amount,
          to,
        });
        const swapOut = tx.transfers.find(t =>
          t.asset === evmMeta.feeAsset && t.amount === amount && t.to === address
        );
        if (swapOut) {
          swapOut.category = isSelf(swapOut.from) ? SwapOut : Noop;
          swapOut.index = "index" in swapOut ? swapOut.index : index - 1;
          if (evmTx.to === wethAddress || evmTx.to === wmaticAddress) {
            tx.method = "Trade";
          }
          // If there's a same-value eth transfer to the swap recipient, index it before
          const transfer = tx.transfers.find(t =>
            t.asset === evmMeta.feeAsset && t.amount === amount
            && t.to === swapOut.from
          );
          if (transfer) {
            transfer.index = "index" in transfer ? transfer.index : index - 1;
          }
        } else {
          log.warn(`Couldn't find a transfer associated w deposit of ${amount} ${asset}`);
        }

      } else if (event.name === "Withdrawal") {
        const from = replaceProxy(event.args.src);
        log.info(`Parsing ${appName} ${event.name} of amount ${amount} from ${from} (${isSelf(from)})`);
        tx.apps.push(appName);
        tx.transfers.push({
          asset,
          category: isSelf(from) ? SwapOut : Noop,
          from,
          index,
          amount: amount,
          to: address,
        });
        const swapIn = tx.transfers.find(t =>
          t.asset === evmMeta.feeAsset && t.amount === amount && t.from === address
        );
        if (swapIn) {
          swapIn.category = isSelf(swapIn.to) ? SwapIn : Noop;
          swapIn.index = "index" in swapIn ? swapIn.index : index + 1;
          if (evmTx.to === wethAddress) {
            tx.method = "Trade";
          }
          // If there's a same-value eth transfer from the swap recipient, index it after
          const transfer = tx.transfers.find(t =>
            t.asset === evmMeta.feeAsset && t.amount === amount
            && t.from === swapIn.to
          );
          if (transfer) {
            transfer.index = "index" in transfer ? transfer.index : index + 1;
          }
        } else {
          log.warn(`Couldn't find an eth call associated w withdrawal of ${amount} ${asset}`);
        }

      } else if (event.name === "Transfer" || event.name === "Approval") {
        continue; // already processed by erc20 parser
      } else {
        log.warn(`Unknown ${appName} event`);
      }

    }
  }

  return tx;
};

export const parsers = { insert: [coreParser], modify: [] };
