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
  abs,
  div,
  eq,
  gt,
  insertVenue,
  round,
  toBN,
  valuesAreClose,
} from "@valuemachine/utils";

import { Apps, Assets, Tokens } from "../../enums";

import {
  dsrAddress,
  migrationAddress,
  vatAddress,
} from "./addresses";

const appName = Apps.Dai;
const { ETH } = Assets;
const { DAI, WETH, PETH, SAI } = Tokens;
const { Expense, Income, Internal, SwapIn, SwapOut, Borrow, Repay } = TransferCategories;

////////////////////////////////////////
/// Abis

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

export const daiParser = (
  tx: Transaction,
  evmTx: EvmTransaction,
  evmMeta: EvmMetadata,
  addressBook: AddressBook,
  logger: Logger,
): Transaction => {
  const log = logger.child({ module: `${appName}:${evmTx.hash.substring(0, 6)}` });
  const { getDecimals, getName } = addressBook;
  // log.debug(tx, `Parsing in-progress tx`);

  const ethish = [WETH, ETH, PETH] as Asset[];

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

  for (const txLog of evmTx.logs) {
    const address = txLog.address;
    const index = txLog.index || 1;

    ////////////////////////////////////////
    // MCD Vat aka Vault manager
    if (address === vatAddress) {
      const logNote = parseLogNote(vatAbi, txLog);
      if (!logNote.name) continue;
      tx.apps.push(appName);
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
            transfer.category === TransferCategories.Expense ||
            transfer.category === TransferCategories.Income
          ) && (
            transfer.asset === asset || (
              ethish.includes(asset) && ethish.includes(transfer.asset)
            )
          ) && valuesAreClose(transfer.amount, abs(wad), div(abs(wad), "10"))
        );
        if (transfer) {
          if (gt(wad, "0")) {
            transfer.category = Internal;
            transfer.to = insertVenue(transfer.from, vault);
            transfer.index = transfer.index || txLog.index;
            tx.method = "Deposit";
          } else {
            transfer.category = Internal;
            transfer.from = insertVenue(transfer.to, vault);
            transfer.index = transfer.index || txLog.index;
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
          (
            transfer.category === TransferCategories.Expense ||
            transfer.category === TransferCategories.Income
          ) && transfer.asset === DAI
          && valuesAreClose(transfer.amount, abs(dart), div(abs(dart), "10"))
        );
        if (transfer) {
          if (gt(dart, "0")) {
            transfer.category = Borrow;
            transfer.from = insertVenue(transfer.to, vault);
            tx.method = "Borrow";
          } else {
            // TODO: tag fee transfer..?
            transfer.category = Repay;
            transfer.to = insertVenue(transfer.from, vault);
            tx.method = "Repayment";
          }
        } else {
          log.warn(`Vat.${logNote.name}: Can't find a DAI transfer of about ${dart}`);
        }

        /*
      } else if (logNote.name === "move") {
        const vault = `${appName}-Vault-${logNote.args[0].replace(/0+$/, "")}`;
        const amt = formatUnits(toBN(logNote.args[2] || "0x00").fromTwos(256), 45);
        log.info(`Found a vat.move call for ${vault} of ${amt} DAI`);
        */

      } else if (logNote.name === "flux") {
        log.info(`Found flux!`);
      }

    ////////////////////////////////////////
    // MCD Pot aka DSR
    } else if (address === dsrAddress) {
      const logNote = parseLogNote(potAbi, txLog);
      if (!logNote.name) continue;
      tx.apps.push(appName);
      log.debug(`Found Pot call ${txLog.topics[0].substring(0,10)}: ${logNote.name}(${
        logNote.args.map(a => a.length > 16 ? a.substring(0, 18) + ".." : a)
      })`);

      if (logNote.name === "join") {
        const wad = formatUnits(hexlify(stripZeros(logNote.args[0])), 18);
        const deposit = tx.transfers.find(t =>
          t.asset === DAI &&
          t.category === Expense &&
          valuesAreClose(t.amount, wad, div(wad, "10"))
        );
        if (deposit) {
          deposit.category = Internal;
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
          valuesAreClose(t.amount, wad, div(wad, "10"))
        );
        if (withdraw) {
          withdraw.category = Internal;
          withdraw.from = insertVenue(withdraw.to, `${appName}-DSR`);
          tx.method = "Withdraw";
        } else {
          log.warn(`Pot.${logNote.name}: Can't find a DAI income of about ${wad}`);
        }
      }

    }
  }

  // log.debug(tx, `Done parsing ${appName}`);
  return tx;
};
