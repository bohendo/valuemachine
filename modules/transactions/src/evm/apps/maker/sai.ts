import { hexlify, stripZeros } from "@ethersproject/bytes";
import { formatUnits } from "@ethersproject/units";
import { Asset, Logger } from "@valuemachine/types";
import { math, valuesAreClose } from "@valuemachine/utils";

import { TransferCategories } from "../../../enums";
import { AddressBook, Transaction } from "../../../types";
import { Apps, Assets, Tokens } from "../../enums";
import { EvmMetadata, EvmTransaction } from "../../types";
import { diffAsc, parseEvent } from "../../utils";

import {
  saiPitAddress,
  tubAddress,
  cageAddress,
} from "./addresses";
import { parseLogNote } from "./utils";

const appName = Apps.Sai;
const { ETH } = Assets;
const { MKR, WETH, PETH, SAI } = Tokens;
const { Fee, Internal, SwapIn, SwapOut, Borrow, Repay } = TransferCategories;

////////////////////////////////////////
/// Abis

const tubAbi = [
  "event LogNewCup(address indexed lad, bytes32 cup)",
  "event LogNote(bytes4 indexed sig, address indexed guy, bytes32 indexed foo, bytes32 indexed bar, uint256 wad, bytes fax) anonymous",
  "function join(uint256 wad)",
  "function exit(uint256 wad)",
  "function open() returns (bytes32 cup)",
  "function give(bytes32 cup, address guy)",
  "function lock(bytes32 cup, uint256 wad)",
  "function free(bytes32 cup, uint256 wad)",
  "function draw(bytes32 cup, uint256 wad)",
  "function wipe(bytes32 cup, uint256 wad)",
  "function shut(bytes32 cup)",
  "function bite(bytes32 cup)",
];

const cageAbi = [
  "event FreeCash(address sender, uint256 amount)",
  "function freeCash(uint256 wad) returns (uint256 cashoutBalance)",
  "function sai() view returns (address)",
  "function tap() view returns (address)",
  "function weth() view returns (address)"
];

////////////////////////////////////////
/// Parser

export const saiParser = (
  tx: Transaction,
  evmTx: EvmTransaction,
  evmMeta: EvmMetadata,
  addressBook: AddressBook,
  logger: Logger,
): Transaction => {
  const log = logger.child({ name: `${appName}:${evmTx.hash.substring(0, 6)}` });
  const { isSelf } = addressBook;
  const ethish = [WETH, ETH, PETH] as Asset[];

  for (const txLog of evmTx.logs) {
    const address = txLog.address;

    ////////////////////////////////////////
    // SCD Tub
    if (address === tubAddress) {

      const event = parseEvent(tubAbi, txLog, evmMeta);
      if (event?.name === "LogNewCup") {
        tx.method = `Create CDP-${math.toBN(event.args.cup)}`;
        continue;
      }
      tx.apps.push(appName);
      const logNote = parseLogNote(tubAbi, txLog);
      if (!logNote.name || logNote.name === "open") continue;
      log.debug(`Found Tub call ${txLog.topics[0].substring(0,10)}: ${logNote.name}(${
        logNote.args.map(a => a.length > 16 ? a.substring(0, 18) + ".." : a)
      })`);

      if (logNote.name === "give") {
        tx.method = `Give CDP-${math.toBN(logNote.args[1])}`;

      } else if (logNote.name === "bite") {
        tx.method = `Bite CDP-${math.toBN(logNote.args[1])}`;

      } else if (logNote.name === "shut") {
        tx.method = `Shut CDP-${math.toBN(logNote.args[1])}`;

      // WETH -> PETH: Categorize WETH transfer as a swap out
      } else if (logNote.name === "join") {
        const wad = formatUnits(logNote.args[1], 18);
        // Get the WETH transfer with the amount that's closest to the wad
        const swapOut = tx.transfers.filter(t =>
          t.asset === WETH && !isSelf(t.to) && isSelf(t.from)
        ).sort(diffAsc(wad))[0];
        if (swapOut) {
          swapOut.category = SwapOut;
          swapOut.to = address;
          if (evmTx.to === tubAddress) {
            tx.method = "Trade";
          }
        } else if (evmTx.to === tubAddress) {
          // Not a problem if we're interacting via a proxy bc this wouldn't interact w self
          log.warn(`Tub.${logNote.name}: Can't find a WETH transfer of ${wad}`);
        }

      // PETH -> WETH: Categorize WETH transfer as a swap in
      } else if (logNote.name === "exit") {
        const wad = formatUnits(logNote.args[1], 18);
        // Get the WETH transfer with the amount that's closest to the wad
        const swapIn = tx.transfers.filter(t =>
          t.asset === WETH && isSelf(t.to) && !isSelf(t.from)
        ).sort(diffAsc(wad))[0];
        if (swapIn) {
          swapIn.category = SwapIn;
          swapIn.from = address;
          if (evmTx.to === tubAddress) {
            tx.method = "Trade";
          }
        } else if (evmTx.to === tubAddress) {
          // Not a problem if we're interacting via a proxy bc this wouldn't interact w self
          log.warn(`Tub.${logNote.name}: Can't find a WETH transfer of ${wad}`);
        }

      // PETH -> CDP: Categorize PETH transfer as deposit
      } else if (logNote.name === "lock") {
        const cdp = `${evmMeta.name}/${appName}-CDP-${math.toBN(logNote.args[1])}`;
        const wad = formatUnits(hexlify(stripZeros(logNote.args[2])), 18);
        const transfer = tx.transfers.filter(t =>
          t.category !== Fee && t.asset === PETH
          && isSelf(t.from)
          && !isSelf(t.to)
          && (tubAddress === t.to || isSelf(t.from))
        ).sort(diffAsc(wad))[0];
        if (transfer) {
          transfer.category = Internal;
          transfer.to = cdp;
          tx.method = "Deposit";
        } else {
          log.warn(`Tub.${logNote.name}: Can't find a P/W/ETH transfer of about ${wad}`);
        }

      // PETH <- CDP: Categorize PETH transfer as withdraw
      } else if (logNote.name === "free") {
        const cdp = `${evmMeta.name}/${appName}-CDP-${math.toBN(logNote.args[1])}`;
        const wad = formatUnits(hexlify(stripZeros(logNote.args[2])), 18);
        const transfers = tx.transfers.filter(t =>
          ethish.includes(t.asset)
          && isSelf(t.to)
          && (tubAddress === t.from || isSelf(t.to))
        ).sort(diffAsc(wad)).sort((t1, t2) =>
          // First try to match a PETH transfer
          (t1.asset === PETH && t2.asset !== PETH) ? -1
          : (t1.asset !== PETH && t2.asset === PETH) ? 1
          // Second try to match a WETH transfer
          : (t1.asset === WETH && t2.asset !== WETH) ? -1
          : (t1.asset !== WETH && t2.asset === WETH) ? 1
          // Last try to match an ETH transfer
          : (t1.asset === ETH && t2.asset !== ETH) ? -1
          : 1
        );
        const transfer = transfers[0];
        if (transfer) {
          transfer.category = Internal;
          transfer.from = cdp;
          tx.method = "Withdraw";
        } else {
          log.warn(`Tub.${logNote.name}: Can't find a PETH transfer of about ${wad}`);
        }

      // SAI <- CDP
      } else if (logNote.name === "draw") {
        const cdp = `${evmMeta.name}/${appName}-CDP-${math.toBN(logNote.args[1])}`;
        const wad = formatUnits(hexlify(stripZeros(logNote.args[2])), 18);
        const borrow = tx.transfers.filter(t =>
          t.asset === SAI && isSelf(t.to)
        ).sort(diffAsc(wad))[0];
        if (borrow) {
          borrow.category = Borrow;
          borrow.from = cdp;
          tx.method = "Borrow";
        } else {
          log.warn(`Tub.${logNote.name}: Can't find a SAI transfer of ${wad}`);
        }

      // SAI -> CDP
      } else if (logNote.name === "wipe") {
        const cdp = `${evmMeta.name}/${appName}-CDP-${math.toBN(logNote.args[1])}`;
        const wad = formatUnits(hexlify(stripZeros(logNote.args[2])), 18);
        const repay = tx.transfers.filter(t =>
          t.asset === SAI && isSelf(t.from) && t.category !== Fee
        ).sort(diffAsc(wad))[0];
        if (repay) {
          repay.category = Repay;
          repay.to = cdp;
          tx.method = "Repayment";
        } else {
          log.warn(`Tub.${logNote.name}: Can't find a SAI transfer of ${wad}`);
        }
        // Handle MKR fee
        const fee = tx.transfers.find(t =>
          isSelf(t.from) && !isSelf(t.to) && t.asset === MKR
        );
        if (fee) {
          fee.category = Fee;
          fee.to = saiPitAddress;
        } else {
          log.warn(`Tub.${logNote.name}: Can't find a MKR/SAI fee`);
        }
      }

    ////////////////////////////////////////
    // SCD Cage
    // During global settlement, the cage is used to redeem no-longer-stable-coins for collateral
    } else if (address === cageAddress) {
      const event = parseEvent(cageAbi, txLog, evmMeta);
      if (event?.name === "FreeCash") {
        tx.apps.push(appName);
        const wad = formatUnits(event.args[1], 18);
        log.info(`Parsing SaiCage FreeCash event for ${wad} ETH`);
        const swapOut = tx.transfers.find(t =>
          t.asset === SAI
          && isSelf(t.from)
          && t.to === cageAddress
          && math.gt(t.amount, "0")
        );
        if (swapOut) {
          swapOut.category = SwapOut;
          swapOut.to = address;
        } else {
          log.warn(`Cage.${event.name}: Can't find any SAI transfer`);
        }
        const swapIn = tx.transfers.find(t =>
          t.asset === ETH
          && isSelf(t.to)
          && t.from === cageAddress
          && valuesAreClose(t.amount, wad, math.div(wad, "100"))
        );
        if (swapIn) {
          swapIn.category = SwapIn;
          swapIn.from = address;
          swapIn.index = swapOut.index + 1;
        } else {
          log.warn(`Cage.${event.name}: Can't find an ETH transfer of ${wad}`);
        }
        tx.method = "Redeem";
      }
    }
  }

  return tx;
};
