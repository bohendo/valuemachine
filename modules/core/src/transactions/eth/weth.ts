import { Contract } from "@ethersproject/contracts";
import { formatUnits } from "@ethersproject/units";
import {
  AddressBook,
  AddressBookJson,
  AddressCategories,
  AssetTypes,
  ChainData,
  EthTransaction,
  Logger,
  Transaction,
  TransactionSources,
  TransferCategories,
} from "@finances/types";
import { math, sm, smeq } from "@finances/utils";

import { getUnique } from "../utils";

const { round } = math;
const source = TransactionSources.Weth;

////////////////////////////////////////
/// Addresses

export const wethAddresses = [
  { name: "WETH", address: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2" },
].map(row => ({ ...row, category: AddressCategories.ERC20 })) as AddressBookJson;

////////////////////////////////////////
/// Interfaces

const weth = new Contract(wethAddresses[0].address, [
  "event Approval(address indexed s/rc, address indexed guy, uint256 wad)",
  "event Deposit(address indexed dst, uint256 wad)",
  "event Transfer(address indexed src, address indexed dst, uint256 wad)",
  "event Withdrawal(address indexed src, uint256 wad)",
]);

////////////////////////////////////////
/// Parser

export const wethParser = (
  tx: Transaction,
  ethTx: EthTransaction,
  addressBook: AddressBook,
  chainData: ChainData,
  logger: Logger,
): Transaction => {
  const log = logger.child({ module: `${source}${ethTx.hash.substring(0, 6)}` });
  const { getName, isSelf } = addressBook;

  for (const txLog of ethTx.logs) {
    const address = sm(txLog.address);
    if (smeq(address, weth.address)) {
      const assetType = AssetTypes.WETH;
      const event = Object.values(weth.interface.events).find(e =>
        weth.interface.getEventTopic(e) === txLog.topics[0]
      );
      if (!event) continue;
      const args = weth.interface.parseLog(txLog).args;
      const amount = formatUnits(args.wad, chainData.getTokenData(address).decimals);
      const index = txLog.index || 1;

      if (event.name === "Deposit") {
        if (!isSelf(args.dst)) {
          log.debug(`Skipping ${assetType} ${event.name} that doesn't involve us`);
          continue;
        } else {
          log.info(`Parsing ${source} ${event.name} event of amount ${round(amount)}`);
        }
        tx.sources = getUnique([source, ...tx.sources]) as TransactionSources[];
        tx.transfers.push({
          assetType,
          category: TransferCategories.SwapIn,
          from: address,
          index,
          quantity: amount,
          to: args.dst,
        });
        const swapOut = tx.transfers.findIndex(t =>
          t.assetType === AssetTypes.ETH && t.quantity === amount
          && isSelf(t.from) && smeq(t.to, address)
        );
        if (swapOut >= 0) {
          tx.transfers[swapOut].category = TransferCategories.SwapOut;
          tx.transfers[swapOut].index = index - 0.1;
          if (smeq(ethTx.to, weth.address)) {
            tx.description = `${getName(args.dst)} swapped ${amount} ETH for WETH`;
          }
          // If there's a same-value eth transfer to the swap recipient, index it before
          const transfer = tx.transfers.findIndex(t =>
            t.assetType === AssetTypes.ETH && t.quantity === amount
            && smeq(t.to, tx.transfers[swapOut].from)
          );
          if (transfer >= 0) {
            tx.transfers[transfer].index = index - 0.2;
          }
        } else {
          log.warn(`Couldn't find an eth call associated w deposit of ${amount} WETH`);
        }

      } else if (event.name === "Withdrawal") {
        if (!isSelf(args.src)) {
          log.debug(`Skipping ${assetType} ${event.name} that doesn't involve us`);
          continue;
        } else {
          log.info(`Parsing ${source} ${event.name} event of amount ${round(amount)}`);
        }
        tx.sources = getUnique([source, ...tx.sources]) as TransactionSources[];
        tx.transfers.push({
          assetType,
          category: TransferCategories.SwapOut,
          from: args.src,
          index,
          quantity: amount,
          to: address,
        });
        const swapIn = tx.transfers.findIndex(t =>
          t.assetType === AssetTypes.ETH && t.quantity === amount
          && isSelf(t.to) && smeq(t.from, address)
        );
        if (swapIn >= 0) {
          tx.transfers[swapIn].category = TransferCategories.SwapIn;
          tx.transfers[swapIn].index = index + 0.1;
          if (smeq(ethTx.to, weth.address)) {
            tx.description = `${getName(args.src)} swapped ${amount} WETH for ETH`;
          }
          // If there's a same-value eth transfer from the swap recipient, index it after
          const transfer = tx.transfers.findIndex(t =>
            t.assetType === AssetTypes.ETH && t.quantity === amount
            && smeq(t.from, tx.transfers[swapIn].to)
          );
          if (transfer >= 0) {
            tx.transfers[transfer].index = index + 0.2;
          }
        } else {
          log.warn(`Couldn't find an eth call associated w withdrawal of ${amount} WETH`);
        }

      } else if (event.name === "Transfer" || event.name === "Approval") {
        log.debug(`Skipping ${source} ${event.name} that was already processed`);
      } else {
        log.warn(`Unknown ${source} event`);
      }

    }
  }

  // log.debug(tx, `Done parsing ${source}`);
  return tx;
};
