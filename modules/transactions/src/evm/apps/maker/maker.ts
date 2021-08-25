import { Interface } from "@ethersproject/abi";
import { hexlify, stripZeros } from "@ethersproject/bytes";
import { AddressZero, HashZero } from "@ethersproject/constants";
import { formatUnits } from "@ethersproject/units";
import {
  AddressBook,
  Asset,
  EvmMetadata,
  EvmTransaction,
  EvmTransactionLog,
  Guards,
  Logger,
  Transaction,
  TransferCategories,
} from "@valuemachine/types";
import {
  abs,
  div,
  eq,
  gt,
  insertVenue,
  round,
  toBN,
  valuesAreClose,
} from "@valuemachine/utils";

import { EvmAssets } from "../../assets";
import { diffAsc, parseEvent } from "../utils";

import {
  addresses,
  coreAddresses,
  factoryAddresses,
  tokenAddresses,
} from "./addresses";
import { assets } from "./assets";

export const appName = "Maker";

const { ETH, WETH } = EvmAssets;
const { DAI, MKR, PETH, SAI } = assets;
const { Expense, Income, Deposit, Withdraw, SwapIn, SwapOut, Borrow, Repay } = TransferCategories;

////////////////////////////////////////
/// Addresses

const DSR = "DSR";
const tub = "scd-tub";
const vat = "mcd-vat";
const cage = "scd-cage";
const migration = "mcd-migration";
const pit = "scd-gen-pit";

const saiAddress = addresses.find(e => e.name === SAI)?.address;
const tubAddress = addresses.find(e => e.name.endsWith(tub))?.address;
const vatAddress = addresses.find(e => e.name.endsWith(vat))?.address;
const dsrAddress = addresses.find(e => e.name.endsWith(DSR))?.address;
const pethAddress = addresses.find(e => e.name === PETH)?.address;
const cageAddress = addresses.find(e => e.name.endsWith(cage))?.address;
const migrationAddress = addresses.find(e => e.name.endsWith(migration))?.address;
const scdPitAddress = addresses.find(e => e.name.endsWith(pit))?.address;

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

const vatAbi = [
  "event LogNote(bytes4 indexed sig, bytes32 indexed arg1, bytes32 indexed arg2, bytes32 indexed arg3, bytes data) anonymous",
  "function cage()",
  "function can(address, address) view returns (uint256)",
  "function dai(address) view returns (uint256)",
  "function debt() view returns (uint256)",
  "function deny(address usr)",
  "function file(bytes32 ilk, bytes32 what, uint256 data)",
  "function file(bytes32 what, uint256 data)",
  "function flux(bytes32 ilk, address src, address dst, uint256 wad)",
  "function fold(bytes32 i, address u, int256 rate)",
  "function fork(bytes32 ilk, address src, address dst, int256 dink, int256 dart)",
  "function frob(bytes32 i, address u, address v, address w, int256 dink, int256 dart)",
  "function gem(bytes32, address) view returns (uint256)",
  "function grab(bytes32 i, address u, address v, address w, int256 dink, int256 dart)",
  "function heal(uint256 rad)",
  "function hope(address usr)",
  "function ilks(bytes32) view returns (uint256 Art, uint256 rate, uint256 spot, uint256 line, uint256 dust)",
  "function init(bytes32 ilk)",
  "function Line() view returns (uint256)",
  "function live() view returns (uint256)",
  "function move(address src, address dst, uint256 rad)",
  "function nope(address usr)",
  "function rely(address usr)",
  "function sin(address) view returns (uint256)",
  "function slip(bytes32 ilk, address usr, int256 wad)",
  "function suck(address u, address v, uint256 rad)",
  "function urns(bytes32, address) view returns (uint256 ink, uint256 art)",
  "function vice() view returns (uint256)",
  "function wards(address) view returns (uint256)"
];

const potAbi = [
  "event LogNote(bytes4 indexed sig, address indexed usr, bytes32 indexed arg1, bytes32 indexed arg2, bytes data) anonymous",
  "function Pie() view returns (uint256)",
  "function cage()",
  "function chi() view returns (uint256)",
  "function deny(address guy)",
  "function drip() returns (uint256 tmp)",
  "function dsr() view returns (uint256)",
  "function exit(uint256 wad)",
  "function file(bytes32 what, address addr)",
  "function file(bytes32 what, uint256 data)",
  "function join(uint256 wad)",
  "function live() view returns (uint256)",
  "function pie(address) view returns (uint256)",
  "function rely(address guy)",
  "function rho() view returns (uint256)",
  "function vat() view returns (address)",
  "function vow() view returns (address)",
  "function wards(address) view returns (uint256)"
];

const proxyAbi = [
  "event Created(address indexed sender, address indexed owner, address proxy, address cache)"
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

export const makerParser = (
  tx: Transaction,
  evmTx: EvmTransaction,
  evmMeta: EvmMetadata,
  addressBook: AddressBook,
  logger: Logger,
): Transaction => {
  const log = logger.child({ module: `${appName}:${evmTx.hash.substring(0, 6)}` });
  const addressZero = `${evmMeta.name}/${AddressZero}`; 
  const { getDecimals, getName, isSelf } = addressBook;
  // log.debug(tx, `Parsing in-progress tx`);

  const ethish = [WETH, ETH, PETH] as Asset[];

  if (coreAddresses.some(e => e.address === evmTx.to)) {
    tx.apps.push(appName);
  }

  ////////////////////////////////////////
  // SCD -> MCD Migration
  if (evmTx.to === migrationAddress) {
    tx.apps.push(appName);
    const swapOut = tx.transfers.find(t => t.asset === SAI);
    const swapIn = tx.transfers.find(t => t.asset === DAI);
    if (swapOut) {
      swapOut.category = SwapOut;
      swapOut.to = migrationAddress;
    } else {
      log.warn(`Can't find a SwapOut SAI transfer`);
    }
    if (swapIn) {
      swapIn.category = SwapIn;
      swapIn.from = migrationAddress;
    } else {
      log.warn(`Can't find an associated SwapIn DAI transfer`);
    }
    tx.method = "Migrate SAI to DAI";
    return tx;
  }

  ////////////////////////////////////////
  // PETH/SAI/DAI
  // Process token interactions before any of the rest of the maker machinery
  // So that they have all the transfers needed to search through
  for (const txLog of evmTx.logs) {
    const address = txLog.address;
    const index = txLog.index || 1;
    if (coreAddresses.some(e => e.address === address)) {
      tx.apps.push(appName);
    }
    if (tokenAddresses.some(e => e.address === address)) {
      const asset = getName(address) as Asset;
      const event = parseEvent(tokenAbi, txLog, evmMeta);
      if (!event.name) continue;
      const wad = formatUnits(event.args.wad, getDecimals(address));
      if (!isSelf(event.args.guy)) {
        log.debug(`Skipping ${asset} ${event.name} that doesn't involve us (${event.args.guy})`);
        continue;
      }
      if (event.name === "Mint") {
        log.info(`Parsing ${asset} ${event.name} of ${wad}`);
        if (address === pethAddress) {
          const swapIn = {
            asset,
            category: SwapIn,
            from: tubAddress,
            index,
            quantity: wad,
            to: event.args.guy,
          };
          tx.transfers.push(swapIn);
        } else {
          tx.transfers.push({
            asset,
            category: Borrow,
            from: addressZero, // we'll set the real value while parsing Vat events
            index,
            quantity: wad,
            to: event.args.guy,
          });
        }
      } else if (event.name === "Burn") {
        log.info(`Parsing ${asset} ${event.name} of ${wad}`);
        if (address === pethAddress) {
          const swapOut = {
            asset,
            category: SwapOut,
            from: event.args.guy,
            index,
            quantity: wad,
            to: tubAddress,
          };
          tx.transfers.push(swapOut);
        } else {
          tx.transfers.push({
            asset,
            category: Repay,
            from: event.args.guy,
            index,
            quantity: wad,
            to: addressZero, // we'll set the real value while parsing Vat events
          });
        }
      } else if (["Approval", "Transfer"].includes(event.name)) {
        log.debug(`Skipping ${event.name} event from ${asset}`);
      } else {
        log.warn(`Unknown ${event.name} event from ${asset}`);
      }
    }
  }

  for (const txLog of evmTx.logs) {
    const address = txLog.address;
    const index = txLog.index || 1;

    ////////////////////////////////////////
    // Proxy Managers
    if (factoryAddresses.some(e => address === e.address)) {
      const event = parseEvent(proxyAbi, txLog, evmMeta);
      if (event?.name === "Created") {
        tx.method = "Proxy Creation";
      }

    ////////////////////////////////////////
    // MCD Vat aka Vault manager
    } else if (address === vatAddress) {
      const logNote = parseLogNote(vatAbi, txLog);
      if (!logNote.name) continue;
      log.debug(`Found Vat call ${txLog.topics[0].substring(0,10)}: ${logNote.name}(${
        logNote.args.map(a => a.length > 16 ? a.substring(0, 18) + ".." : a)
      })`);

      // Deposit Collateral
      if (logNote.name === "slip") {
        // NOTE: Hacky fix assumes that the joiner calls transfer immediately after slip
        // slip accepts ilk which is a bytes32 that maps to the token address, not super useful
        const assetAddress = evmTx.logs.find(l => l.index === index + 1).address;
        if (!assetAddress) {
          log.warn(`Vat.${logNote.name}: Can't find a token address for ilk ${logNote.args[0]}`);
          continue;
        }
        const vault = `${appName}-Vault-${logNote.args[0].replace(/0+$/, "")}`;
        const wad = formatUnits(
          toBN(logNote.args[2] || "0x00").fromTwos(256),
          getDecimals(assetAddress),
        );
        const asset = getName(assetAddress) as Asset;
        log.info(`Found a change in ${vault} collateral of about ${wad} ${asset}`);
        const transfer = tx.transfers.find(transfer =>
          (
            transfer.asset === asset || (
              ethish.includes(asset) && ethish.includes(transfer.asset)
            )
          ) && valuesAreClose(transfer.quantity, abs(wad), div(abs(wad), "10"))
        );
        if (transfer) {
          if (gt(wad, "0")) {
            transfer.category = Deposit;
            transfer.to = insertVenue(transfer.from, vault);
            tx.method = "Deposit";
          } else {
            transfer.category = Withdraw;
            transfer.from = insertVenue(transfer.to, vault);
            tx.method = "Withdraw";
          }
        } else {
          log.warn(`Vat.${logNote.name}: Can't find a ${asset} transfer of about ${wad}`);
        }

      // Borrow/Repay DAI
      } else if (logNote.name === "frob") {
        const vault = `${appName}-Vault-${logNote.args[0].replace(/0+$/, "")}`;
        const dart = formatUnits(toBN(logNote.args[5] || "0x00").fromTwos(256));
        if (eq(dart, "0")) {
          log.debug(`Vat.${logNote.name}: Skipping zero-value change in ${vault} debt`);
          continue;
        }
        log.info(`Found a change in ${vault} debt of about ${round(dart)} DAI`);
        const transfer = tx.transfers.find(transfer =>
          transfer.asset === DAI
          && valuesAreClose(transfer.quantity, abs(dart), div(abs(dart), "10"))
        );
        if (transfer) {
          if (gt(dart, "0")) {
            transfer.category = Borrow;
            transfer.from = insertVenue(transfer.to, vault);
            tx.method = "Borrow";
          } else {
            transfer.category = Repay;
            transfer.to = insertVenue(transfer.from, vault);
            tx.method = "Repayment";
          }
        } else {
          log.warn(`Vat.${logNote.name}: Can't find a DAI transfer of about ${dart}`);
        }
      }

    ////////////////////////////////////////
    // MCD Pot aka DSR
    } else if (address === dsrAddress) {
      const logNote = parseLogNote(potAbi, txLog);
      if (!logNote.name) continue;
      log.debug(`Found Pot call ${txLog.topics[0].substring(0,10)}: ${logNote.name}(${
        logNote.args.map(a => a.length > 16 ? a.substring(0, 18) + ".." : a)
      })`);

      if (logNote.name === "join") {
        const wad = formatUnits(hexlify(stripZeros(logNote.args[0])), 18);
        const deposit = tx.transfers.find(t =>
          t.asset === DAI &&
          t.category === Expense &&
          valuesAreClose(t.quantity, wad, div(wad, "10"))
        );
        if (deposit) {
          deposit.category = Deposit;
          deposit.to = insertVenue(deposit.from, `${appName}-DSR`);
          tx.method = "Deposit";
        } else {
          log.warn(`Pot.${logNote.name}: Can't find a DAI expense of about ${wad}`);
        }

      } else if (logNote.name === "exit") {
        const wad = formatUnits(hexlify(stripZeros(logNote.args[0])), 18);
        const withdraw = tx.transfers.find(t =>
          t.asset === DAI &&
          t.category === Income &&
          valuesAreClose(t.quantity, wad, div(wad, "10"))
        );
        if (withdraw) {
          withdraw.category = Withdraw;
          withdraw.from = insertVenue(withdraw.to, `${appName}-DSR`);
          tx.method = "Withdraw";
        } else {
          log.warn(`Pot.${logNote.name}: Can't find a DAI income of about ${wad}`);
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

    ////////////////////////////////////////
    // SCD Tub
    } else if (address === tubAddress) {
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
          && ([Expense, Deposit] as string[]).includes(t.category)
          && (tubAddress === t.to || isSelf(t.from))
        ).sort(diffAsc(wad))[0];
        if (transfer) {
          transfer.category = Deposit;
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
          && ([Income, Withdraw] as string[]).includes(t.category)
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
          transfer.category = Withdraw;
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
          fee.category = Expense;
          fee.to = scdPitAddress;
        } else {
          log.warn(`Tub.${logNote.name}: Can't find a MKR/SAI fee`);
        }

      }
    }
  }

  // log.debug(tx, `Done parsing ${appName}`);
  return tx;
};
