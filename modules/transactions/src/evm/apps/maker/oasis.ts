// import { Interface } from "@ethersproject/abi";
import { formatUnits } from "@ethersproject/units";
import {
  AddressBook,
  EvmMetadata,
  EvmTransaction,
  Logger,
  Transaction,
  TransferCategories,
} from "@valuemachine/types";

import { Apps } from "../../enums";
import { getTransferCategory, parseEvent } from "../../utils";

import {
  exchangeAddresses,
  proxyAddresses,
} from "./addresses";

const appName = Apps.Oasis;
const { Income, Expense, SwapIn, SwapOut } = TransferCategories;

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
  const { getDecimals, getName } = addressBook;

  // Save a list of relevant proxies to treat as self (TODO: dedup w ./tokens)
  const proxies = proxyAddresses.map(e => e.address);
  for (const txLog of evmTx.logs) {
    if (txLog.topics[0].startsWith("0x1cff79cd")) { // TODO: hash sig instead of hardcoding?
      proxies.push(txLog.address);
    }
  }

  const isProxy = address => proxies.includes(address);
  const isSelf = address => addressBook.isSelf(address) || isProxy(address);

  // If we sent this evmTx to a proxy, replace proxy addresses w tx origin
  if (addressBook.isSelf(evmTx.from) && isProxy(evmTx.to)) {
    tx.method = "Trade";
    tx.transfers.forEach(transfer => {
      if (isProxy(transfer.from)) {
        transfer.from = evmTx.from;
        transfer.category = getTransferCategory(transfer.from, transfer.to, addressBook);
        if (transfer.category === Expense) transfer.category = SwapOut;
      }
      if (isProxy(transfer.to)) {
        transfer.to = evmTx.from;
        transfer.category = getTransferCategory(transfer.from, transfer.to, addressBook);
        if (transfer.category === Income) transfer.category = SwapIn;
      }
    });
  }

  for (const txLog of evmTx.logs) {
    const address = txLog.address;
    if (exchangeAddresses.some(e => e.address === address)) {
      tx.apps.push(appName);
      const event = parseEvent(oasisAbi, txLog, evmMeta);

      if (event.name === "LogTake") {
        log.debug(`Parsing ${appName} ${event.name} event`);
        let inAmt, inGem, outAmt, outGem;
        if (isSelf(event.args.maker)) {
          inGem = getName(event.args.buy_gem);
          inAmt = formatUnits(event.args.buy_amt, getDecimals(address));
          outGem = getName(event.args.pay_gem);
          outAmt = formatUnits(event.args.pay_amt, getDecimals(address));
        } else if (isSelf(event.args.taker)) {
          inGem = getName(event.args.pay_gem);
          outGem = getName(event.args.buy_gem);
          inAmt = formatUnits(event.args.pay_amt, getDecimals(address));
          outAmt = formatUnits(event.args.buy_amt, getDecimals(address));
        } else {
          log.debug(`Skipping trade w maker=${event.args.maker} & taker=${event.args.taker}`);
          continue;
        }
        log.info(`Found trade of ${outAmt} ${outGem} for ${inAmt} ${inGem}`);
        const swapIn = tx.transfers.find(transfer =>
          transfer.asset === inGem && transfer.amount === inAmt
          && isSelf(transfer.to) && !isSelf(transfer.from)
        );
        if (swapIn) {
          swapIn.category = SwapIn;
          swapIn.from = address;
        } else {
          log.warn(`Couldn't find a swap in of ${inAmt} ${inGem}`);
        }
        const swapOut = tx.transfers.find(transfer =>
          transfer.asset === outGem && transfer.amount === outAmt
          && isSelf(transfer.from) && !isSelf(transfer.to)
        );
        if (swapOut) {
          swapOut.category = SwapOut;
          swapOut.to = address;
        } else {
          log.warn(`Couldn't find a swap out of ${outAmt} ${outGem}`);
        }
      }

    }
  }
  return tx;
};

