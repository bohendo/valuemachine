import { formatUnits } from "@ethersproject/units";
import {
  AddressBook,
  AddressCategories,
  Assets,
  EvmMetadata,
  EvmTransaction,
  Logger,
  Transaction,
  TransferCategories,
} from "@valuemachine/types";
import {
  setAddressCategory,
} from "@valuemachine/utils";

import { parseEvent } from "../utils";

export const appName = "Weth";

const { ETH, WETH } = Assets;
const { SwapIn, SwapOut } = TransferCategories;

////////////////////////////////////////
/// Addresses

export const wethAddresses = [
  { name: WETH, address: "Ethereum/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2" },
].map(setAddressCategory(AddressCategories.ERC20));

const wethAddress = wethAddresses.find(e => e.name === WETH).address;

////////////////////////////////////////
/// Abis

const wethAbi = [
  "event Approval(address indexed src, address indexed guy, uint256 wad)",
  "event Deposit(address indexed dst, uint256 wad)",
  "event Transfer(address indexed src, address indexed dst, uint256 wad)",
  "event Withdrawal(address indexed src, uint256 wad)",
];

////////////////////////////////////////
/// Parser

export const wethParser = (
  tx: Transaction,
  evmTx: EvmTransaction,
  evmMeta: EvmMetadata,
  addressBook: AddressBook,
  logger: Logger,
): Transaction => {
  const log = logger.child({ module: `${appName}:${evmTx.hash.substring(0, 6)}` });
  const { getDecimals, isSelf } = addressBook;

  for (const txLog of evmTx.logs) {
    const address = txLog.address;
    if (address === wethAddress) {
      const asset = WETH;
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
          category: SwapIn,
          from: address,
          index,
          quantity: amount,
          to: event.args.dst,
        });
        const swapOut = tx.transfers.find(t =>
          t.asset === ETH && t.quantity === amount
          && isSelf(t.from) && t.to === address
        );
        if (swapOut) {
          swapOut.category = SwapOut;
          swapOut.index = index - 0.1;
          if (evmTx.to === wethAddress) {
            tx.method = "Trade";
          }
          // If there's a same-value eth transfer to the swap recipient, index it before
          const transfer = tx.transfers.find(t =>
            t.asset === ETH && t.quantity === amount
            && t.to === swapOut.from
          );
          if (transfer) {
            transfer.index = index - 0.2;
          }
        } else {
          log.warn(`Couldn't find an eth call associated w deposit of ${amount} WETH`);
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
          category: SwapOut,
          from: event.args.src,
          index,
          quantity: amount,
          to: address,
        });
        const swapIn = tx.transfers.find(t =>
          t.asset === ETH && t.quantity === amount
          && isSelf(t.to) && t.from === address
        );
        if (swapIn) {
          swapIn.category = SwapIn;
          swapIn.index = index + 0.1;
          if (evmTx.to === wethAddress) {
            tx.method = "Trade";
          }
          // If there's a same-value eth transfer from the swap recipient, index it after
          const transfer = tx.transfers.find(t =>
            t.asset === ETH && t.quantity === amount
            && t.from === swapIn.to
          );
          if (transfer) {
            transfer.index = index + 0.2;
          }
        } else {
          log.warn(`Couldn't find an eth call associated w withdrawal of ${amount} WETH`);
        }

      } else if (event.name === "Transfer" || event.name === "Approval") {
        log.debug(`Skipping ${appName} ${event.name} that was already processed`);
      } else {
        log.warn(`Unknown ${appName} event`);
      }

    }
  }

  // log.debug(tx, `Done parsing ${appName}`);
  return tx;
};
