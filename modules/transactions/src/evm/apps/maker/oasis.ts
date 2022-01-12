import { formatUnits } from "@ethersproject/units";
import { Logger } from "@valuemachine/types";
import { math, diffBalances } from "@valuemachine/utils";

import { TransferCategories } from "../../../enums";
import { AddressBook, Transaction } from "../../../types";
import { Apps, Methods } from "../../enums";
import { EvmMetadata, EvmTransaction } from "../../types";
import { parseEvent, sumTransfers } from "../../utils";

import { exchangeAddresses } from "./addresses";
import { findDSProxies } from "./proxy";

const appName = Apps.Oasis;
const { Repay, SwapIn, SwapOut } = TransferCategories;

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
  const log = logger.child({ name: `${appName}:${evmTx.hash.substring(0, 6)}` });
  const { getDecimals, getName } = addressBook;

  for (const txLog of evmTx.logs) {
    const address = txLog.address;
    if (exchangeAddresses.some(e => e.address === address)) {
      tx.apps.push(appName);

      const event = parseEvent(oasisAbi, txLog, evmMeta);

      if (event.name === "LogTake") {
        const { maker, taker } = event.args;
        log.info(`Parsing ${appName} ${event.name} event w maker=${maker} & taker=${taker}`);
        const dsProxies = findDSProxies(evmTx);
        const isSelf = a => addressBook.isSelf(a) ||
          (addressBook.isSelf(evmTx.from) && dsProxies.includes(a));
        let inAmt, inGem, outAmt, outGem;
        if (isSelf(maker)) {
          inGem = getName(event.args.buy_gem);
          inAmt = formatUnits(event.args.buy_amt, getDecimals(address));
          outGem = getName(event.args.pay_gem);
          outAmt = formatUnits(event.args.pay_amt, getDecimals(address));
        } else if (isSelf(taker)) {
          inGem = getName(event.args.pay_gem);
          outGem = getName(event.args.buy_gem);
          inAmt = formatUnits(event.args.pay_amt, getDecimals(address));
          outAmt = formatUnits(event.args.buy_amt, getDecimals(address));
        } else {
          log.debug(`Skipping trade w maker=${maker} & taker=${taker}`);
          continue;
        }
        log.info(`Found trade of ${outAmt} ${outGem} for ${inAmt} ${inGem}`);
        const swapIn = tx.transfers.find(transfer =>
          transfer.asset === inGem && transfer.amount === inAmt
          && isSelf(transfer.to) && !isSelf(transfer.from)
        );
        if (swapIn) {
          tx.method = Methods.Trade;
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
          tx.method = Methods.Trade;
          swapOut.category = SwapOut;
          swapOut.to = address;
        } else {
          log.warn(`Couldn't find a swap out of ${outAmt} ${outGem}`);
        }
      }
    }
  }

  // Detect leftover dust & add it to our swaps out
  if (tx.apps.includes(appName)) {
    // Subtract all swaps/payments in & out of our account
    const [totalOut, totalIn] = diffBalances([
      // Repay if we're paying CDP fees via SAI/DAI swap for MKR
      sumTransfers(tx.transfers.filter(t => t.category === SwapOut || t.category === Repay)),
      sumTransfers(tx.transfers.filter(t => t.category === SwapIn)),
    ]);
    log.debug(totalOut, `Total disposed`);
    // Subtract swaps in from transfers between us & our proxy
    const [noopOut] = diffBalances([
      sumTransfers(tx.transfers.filter(t => t.to === t.from)),
      totalIn,
    ]);
    log.debug(noopOut, `Total internal transfers to/from proxies`);
    // Subtract swaps out from transfers to the proxy to detect leftover dust
    const [dust] = diffBalances([noopOut, totalOut]);
    Object.entries(dust).forEach(entry => {
      const [asset, amount] = entry;
      log.warn(`DSProxy left behind ${amount} ${asset}, adding this to our first swap out`);
      const swapOut = tx.transfers.find(t => t.category === SwapOut && t.asset === asset);
      if (swapOut) {
        swapOut.amount = math.add(swapOut.amount, amount);
      }
    });
  }

  return tx;
};

