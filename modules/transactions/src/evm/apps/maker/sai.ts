import { Interface } from "@ethersproject/abi";
import { hexlify, stripZeros } from "@ethersproject/bytes";
import { HashZero } from "@ethersproject/constants";
import { formatUnits } from "@ethersproject/units";
import {
  AddressBook,
  Asset,
  EvmMetadata,
  EvmTransaction,
  EvmTransactionLog,
  Logger,
  Transaction,
  TransferCategories,
} from "@valuemachine/types";
import {
  div,
  gt,
  insertVenue,
  toBN,
  valuesAreClose,
} from "@valuemachine/utils";

import { Assets, Guards } from "../../../enums";
import { diffAsc, parseEvent } from "../utils";

import {
  addresses,
  coreAddresses,
} from "./addresses";
import { apps, assets } from "./enums";

const appName = apps.Sai;

const { ETH, WETH } = Assets;
const { MKR, PETH, SAI } = assets;
const { Expense, Fee, Income, Internal, SwapIn, SwapOut, Borrow, Repay } = TransferCategories;

////////////////////////////////////////
/// Addresses

const tub = "scd-tub";
const cage = "scd-cage";

const saiAddress = addresses.find(e => e.name === SAI)?.address;
const tubAddress = addresses.find(e => e.name.endsWith(tub))?.address;
const cageAddress = addresses.find(e => e.name.endsWith(cage))?.address;

////////////////////////////////////////
/// Abis

const tokenAbi = [
  "event Approval(address indexed src, address indexed guy, uint256 wad)",
  "event Burn(address indexed guy, uint256 wad)",
  "event LogNote(bytes4 indexed sig, address indexed guy, bytes32 indexed foo, bytes32 indexed bar, uint256 wad, bytes fax) anonymous",
  "event Mint(address indexed guy, uint256 wad)",
  "event Transfer(address indexed src, address indexed dst, uint256 wad)"
];

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

const parseLogNote = (
  abi: string[],
  ethLog: EvmTransactionLog,
): { name: string; args: string[]; } => {
  const iface = new Interface(abi);
  return {
    name: Object.values(iface.functions).find(e =>
      ethLog.topics[0].startsWith(iface.getSighash(e))
    )?.name,
    args: ethLog.data
      .substring(2 + 64 + 64 + 8)
      .match(/.{1,64}/g)
      .filter(e => e !== "0".repeat(64 - 8))
      .map(s => `0x${s}`)
      .map(str => [HashZero, "0x"].includes(str)
        ? "0x00"
        : str.startsWith("0x000000000000000000000000")
          ? `0x${str.substring(26)}`
          : str
      ),
  };
};

export const saiParser = (
  tx: Transaction,
  evmTx: EvmTransaction,
  evmMeta: EvmMetadata,
  addressBook: AddressBook,
  logger: Logger,
): Transaction => {
  const log = logger.child({ module: `${appName}:${evmTx.hash.substring(0, 6)}` });
  const { isSelf } = addressBook;
  // log.debug(tx, `Parsing in-progress tx`);

  const ethish = [WETH, ETH, PETH] as Asset[];

  if (coreAddresses.some(e => e.address === evmTx.to)) {
    tx.apps.push(appName);
  }

  for (const txLog of evmTx.logs) {
    const address = txLog.address;
    const index = txLog.index || 1;

    ////////////////////////////////////////
    // SCD Tub
    if (address === tubAddress) {
      const event = parseEvent(tubAbi, txLog, evmMeta);
      if (event?.name === "LogNewCup") {
        tx.method = `Create CDP-${toBN(event.args.cup)}`;
        continue;
      }
      const logNote = parseLogNote(tubAbi, txLog);
      if (!logNote.name || logNote.name === "open") continue;
      log.debug(`Found Tub call ${txLog.topics[0].substring(0,10)}: ${logNote.name}(${
        logNote.args.map(a => a.length > 16 ? a.substring(0, 18) + ".." : a)
      })`);

      if (logNote.name === "give") {
        tx.method = `Give CDP-${toBN(logNote.args[1])}`;

      } else if (logNote.name === "bite") {
        tx.method = `Bite CDP-${toBN(logNote.args[1])}`;

      } else if (logNote.name === "shut") {
        tx.method = `Shut CDP-${toBN(logNote.args[1])}`;

      // WETH -> PETH: Categorize WETH transfer as a swap out
      } else if (logNote.name === "join") {
        const wad = formatUnits(logNote.args[1], 18);
        // Get the WETH transfer with the quantity that's closest to the wad
        const swapOut = tx.transfers.filter(t =>
          t.asset === WETH
          && t.to !== ETH
          && ([Expense, SwapOut] as string[]).includes(t.category)
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
        // Get the WETH transfer with the quantity that's closest to the wad
        const swapIn = tx.transfers.filter(t =>
          t.asset === WETH
          && ([
            Income,
            SwapIn, // re-handle dup calls instead of logging warning
          ] as string[]).includes(t.category)
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
        const cdp = `${appName}-CDP-${toBN(logNote.args[1])}`;
        const wad = formatUnits(hexlify(stripZeros(logNote.args[2])), 18);
        const transfer = tx.transfers.filter(t =>
          ethish.includes(t.asset)
          && !Object.keys(Guards).includes(t.to)
          && ([Expense, Internal] as string[]).includes(t.category)
          && (tubAddress === t.to || isSelf(t.from))
        ).sort(diffAsc(wad))[0];
        if (transfer) {
          transfer.category = Internal;
          transfer.to = insertVenue(transfer.from, cdp);
          tx.method = "Deposit";
        } else {
          log.warn(`Tub.${logNote.name}: Can't find a P/W/ETH transfer of about ${wad}`);
        }

      // PETH <- CDP: Categorize PETH transfer as withdraw
      } else if (logNote.name === "free") {
        const cdp = `${appName}-CDP-${toBN(logNote.args[1])}`;
        const wad = formatUnits(hexlify(stripZeros(logNote.args[2])), 18);
        const transfers = tx.transfers.filter(t =>
          ethish.includes(t.asset)
          && ([Income, Internal] as string[]).includes(t.category)
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
          transfer.from = insertVenue(transfer.to, cdp);
          tx.method = "Withdraw";
        } else {
          log.warn(`Tub.${logNote.name}: Can't find a PETH transfer of about ${wad}`);
        }

      // SAI <- CDP
      } else if (logNote.name === "draw") {
        const cdp = `${appName}-CDP-${toBN(logNote.args[1])}`;
        const wad = formatUnits(hexlify(stripZeros(logNote.args[2])), 18);
        const borrow = tx.transfers.filter(t =>
          isSelf(t.to)
          && t.asset === SAI
          && ([Income, Borrow] as string[]).includes(t.category)
        ).sort(diffAsc(wad))[0];
        if (borrow) {
          borrow.category = Borrow;
          borrow.from = insertVenue(borrow.to, cdp);
          tx.method = "Borrow";
        } else if (!evmTx.logs.find(l =>
          l.index > index
          && l.address === saiAddress
          && parseEvent(tokenAbi, l, evmMeta).name === "Mint"
        )) {
          // Only warn if there is NOT an upcoming SAI mint evet
          log.warn(`Tub.${logNote.name}: Can't find a SAI transfer of ${wad}`);
        }

      // SAI -> CDP
      } else if (logNote.name === "wipe") {
        const cdp = `${appName}-CDP-${toBN(logNote.args[1])}`;
        const wad = formatUnits(hexlify(stripZeros(logNote.args[2])), 18);
        const repay = tx.transfers.filter(t =>
          t.asset === SAI && ([Expense, Repay] as string[]).includes(t.category)
        ).sort(diffAsc(wad))[0];
        if (repay) {
          repay.category = Repay;
          repay.to = insertVenue(repay.from, cdp);
          tx.method = "Repayment";
        } else if (!evmTx.logs.find(l =>
          l.index > index
          && l.address === saiAddress
          && parseEvent(tokenAbi, l, evmMeta).name === "Burn"
        )) {
          log.warn(`Tub.${logNote.name}: Can't find a SAI transfer of ${wad}`);
        }
        // Handle MKR fee (or find the stable-coins spent to buy MKR)
        // TODO: split repayment into two transfers if we repayed with one lump of DAI
        const feeAsset = [MKR, SAI] as Asset[];
        const fee = tx.transfers.find(t =>
          isSelf(t.from)
          && feeAsset.includes(t.asset)
          // Fee might be a SwapOut eg if we gave SAI to OasisDex to swap for MKR
          && ([Expense, SwapOut] as string[]).includes(t.category)
        );
        if (fee) {
          fee.category = Fee;
          fee.to = insertVenue(fee.from, cdp);
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
        const wad = formatUnits(event.args[1], 18);
        log.info(`Parsing SaiCage FreeCash event for ${wad} ETH`);
        const swapOut = tx.transfers.find(t =>
          t.asset === SAI
          && isSelf(t.from)
          && t.to === cageAddress
          && gt(t.quantity, "0")
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
          && valuesAreClose(t.quantity, wad, div(wad, "100"))
        );
        if (swapIn) {
          swapIn.category = SwapIn;
          swapIn.from = address;
          swapIn.index = swapOut.index + 0.1;
        } else {
          log.warn(`Cage.${event.name}: Can't find an ETH transfer of ${wad}`);
        }
        tx.method = "Redeem";
      }
    }
  }

  // log.debug(tx, `Done parsing ${appName}`);
  return tx;
};
