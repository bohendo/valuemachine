import { formatUnits } from "@ethersproject/units";
import {
  AddressBook,
  AddressCategories,
  Asset,
  EvmMetadata,
  EvmTransaction,
  Logger,
  Transaction,
  Transfer,
  TransferCategories,
} from "@valuemachine/types";
import {
  add,
  valuesAreClose,
} from "@valuemachine/utils";

import { EvmAssets } from "../../assets";
import { parseEvent } from "../utils";

import { exchangeAddresses } from "./addresses";

const { ETH, WETH } = EvmAssets;
const { Income, Expense, SwapIn, SwapOut } = TransferCategories;
export const appName = "Oasis";

////////////////////////////////////////
/// Abis

const oasisAbi = [
  "event LogNote(bytes4 indexed sig, address indexed guy, bytes32 indexed foo, bytes32 indexed bar, uint256 wad, bytes fax) anonymous",
  "event LogItemUpdate(uint256 id)",
  "event LogTrade(uint256 pay_amt, address indexed pay_gem, uint256 buy_amt, address indexed buy_gem)",
  "event LogMake(bytes32 indexed id, bytes32 indexed pair, address indexed maker, address pay_gem, address buy_gem, uint128 pay_amt, uint128 buy_amt, uint64 timestamp)",
  "event LogBump(bytes32 indexed id, bytes32 indexed pair, address indexed maker, address pay_gem, address buy_gem, uint128 pay_amt, uint128 buy_amt, uint64 timestamp)",
  "event LogTake(bytes32 id, bytes32 indexed pair, address indexed maker, address pay_gem, address buy_gem, address indexed taker, uint128 pay_amt, uint128 buy_amt, uint64 timestamp)",
  "event LogKill(bytes32 indexed id, bytes32 indexed pair, address indexed maker, address pay_gem, address buy_gem, uint128 pay_amt, uint128 buy_amt, uint64 timestamp)",
  "event LogBuyEnabled(bool isEnabled)",
  "event LogMinSell(address pay_gem, uint256 min_amount)",
  "event LogMatchingEnabled(bool isEnabled)",
  "event LogUnsortedOffer(uint256 id)",
  "event LogSortedOffer(uint256 id)",
  "event LogAddTokenPairWhitelist(address baseToken, address quoteToken)",
  "event LogRemTokenPairWhitelist(address baseToken, address quoteToken)",
  "event LogInsert(address keeper, uint256 id)",
  "event LogDelete(address keeper, uint256 id)"
];

////////////////////////////////////////
/// Parser

export const oasisParser = (
  tx: Transaction,
  evmTx: EvmTransaction,
  evmMeta: EvmMetadata,
  addressBook: AddressBook,
  logger: Logger,
): Transaction => {
  const log = logger.child({ module: `${appName}:${evmTx.hash.substring(0, 6)}` });
  const { getDecimals, getName, isCategory, isSelf } = addressBook;

  const isSelfy = (address: string): boolean =>
    isSelf(address) || (
      isSelf(evmTx.from) && isCategory(AddressCategories.Proxy)(address) && address === evmTx.to
    );

  const ethish = [WETH, ETH] as Asset[];
  const findSwap = (quantity: string, asset: Asset) => (transfer: Transfer): boolean =>
    (([Income, Expense] as string[]).includes(transfer.category)) && (
      ethish.includes(asset) ? ethish.includes(transfer.asset) : transfer.asset === asset
    ) && valuesAreClose(quantity, transfer.quantity);

  let inAsset;
  let outAsset;
  let inTotal = "0";
  let outTotal = "0";

  for (const txLog of evmTx.logs) {
    const address = txLog.address;
    if (exchangeAddresses.some(e => e.address === address)) {
      tx.apps.push(appName);
      const event = parseEvent(oasisAbi, txLog, evmMeta);

      if (event.name === "LogTake") {
        log.info(`Parsing ${appName} ${event.name} event`);
        let inAmt, inGem, outAmt, outGem;
        // evmTx.to might be a proxy which counts as self as far as this logic is concerned
        if (isSelfy(event.args.maker)) {
          inGem = getName(event.args.buy_gem);
          outGem = getName(event.args.pay_gem);
          inAmt = formatUnits(event.args.buy_amt, getDecimals(address));
          outAmt = formatUnits(event.args.pay_amt, getDecimals(address));
        } else if (isSelfy(event.args.taker)) {
          inGem = getName(event.args.pay_gem);
          outGem = getName(event.args.buy_gem);
          inAmt = formatUnits(event.args.pay_amt, getDecimals(address));
          outAmt = formatUnits(event.args.buy_amt, getDecimals(address));
        } else {
          continue;
        }
        log.debug(`Parsed ${inAmt} ${inGem} incoming & ${outAmt} ${outGem} outgoing`);
        if (inAsset && inAsset !== inGem) {
          log.warn(`Found more than one type of inAsset: ${inAsset} & ${inGem}`);
        } else if (!inAsset) {
          inAsset = inGem;
        }
        if (outAsset && outAsset !== outGem) {
          log.warn(`Found more than one type of outAsset: ${outAsset} & ${outGem}`);
        } else if (!outAsset) {
          outAsset = outGem;
        }

        const swapIn = tx.transfers.find(findSwap(inAmt, inAsset));
        if (swapIn) {
          swapIn.category = SwapIn;
          swapIn.from = address;
        } else {
          log.debug(`Can't find swap in transfer for ${inAmt} ${inAsset}`);
        }

        const swapOut = tx.transfers.find(findSwap(outAmt, outAsset));
        if (swapOut) {
          swapOut.category = SwapOut;
          swapOut.to = address;
          outAsset = swapOut.asset;
        } else {
          log.debug(`Can't find swap out transfer for ${outAmt} ${outAsset}`);
        }

        inTotal = add(inTotal, inAmt);
        outTotal = add(outTotal, outAmt);
      } else {
        log.debug(`Skipping ${appName} ${event.name || "Unknown"} event`);
      }

    }
  }

  if (!tx.apps.includes(appName)) {
    return tx;
  }

  const swapIn = tx.transfers.find(findSwap(inTotal, inAsset));
  if (swapIn) {
    swapIn.category = SwapIn;
  } else {
    log.debug(`Can't find swap in transfer for ${inTotal} ${inAsset}`);
  }
  const swapOut = tx.transfers.find(findSwap(outTotal, outAsset));
  if (swapOut) {
    swapOut.category = SwapOut;
  } else {
    log.debug(`Can't find swap out transfer for ${outTotal} ${outAsset}`);
  }
  tx.method = "Trade";

  // log.debug(tx, `Done parsing ${appName}`);
  return tx;
};

