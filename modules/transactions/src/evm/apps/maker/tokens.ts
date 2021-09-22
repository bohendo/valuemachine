import { AddressZero } from "@ethersproject/constants";
import { formatUnits } from "@ethersproject/units";
import {
  AddressBook,
  Asset,
  EvmMetadata,
  EvmTransaction,
  Logger,
  Transaction,
  TransferCategories,
} from "@valuemachine/types";

import { parseEvent } from "../utils";

import {
  tubAddress,
  pethAddress,
  factoryAddresses,
  tokenAddresses,
} from "./addresses";
import { apps } from "./enums";

const appName = apps.Maker;

const { SwapIn, SwapOut, Borrow, Repay } = TransferCategories;

////////////////////////////////////////
/// Abis

const tokenAbi = [
  "event Approval(address indexed src, address indexed guy, uint256 wad)",
  "event Burn(address indexed guy, uint256 wad)",
  "event LogNote(bytes4 indexed sig, address indexed guy, bytes32 indexed foo, bytes32 indexed bar, uint256 wad, bytes fax) anonymous",
  "event Mint(address indexed guy, uint256 wad)",
  "event Transfer(address indexed src, address indexed dst, uint256 wad)"
];

const proxyAbi = [
  "event Created(address indexed sender, address indexed owner, address proxy, address cache)"
];

////////////////////////////////////////
/// Parser

export const tokenParser = (
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

  ////////////////////////////////////////
  // PETH/SAI/DAI
  // Process token interactions before any of the rest of the maker machinery
  // So that they have all the transfers needed to search through
  for (const txLog of evmTx.logs) {
    const address = txLog.address;
    const index = txLog.index || 1;

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
        tx.apps.push(appName);
        if (address === pethAddress) {
          tx.transfers.push({
            asset,
            category: SwapIn,
            from: tubAddress,
            index,
            amount: wad,
            to: event.args.guy,
          });
        } else {
          tx.transfers.push({
            asset,
            category: Borrow,
            from: addressZero, // we'll set the real value while parsing Vat events
            index,
            amount: wad,
            to: event.args.guy,
          });
        }
      } else if (event.name === "Burn") {
        log.info(`Parsing ${asset} ${event.name} of ${wad}`);
        tx.apps.push(appName);
        if (address === pethAddress) {
          tx.transfers.push({
            asset,
            category: SwapOut,
            from: event.args.guy,
            index,
            amount: wad,
            to: tubAddress,
          });
        } else {
          tx.transfers.push({
            asset,
            category: Repay,
            from: event.args.guy,
            index,
            amount: wad,
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
    if (factoryAddresses.some(e => address === e.address)) {
      const event = parseEvent(proxyAbi, txLog, evmMeta);
      if (event?.name === "Created") {
        tx.method = "Proxy Creation";
        tx.apps.push(appName);
      }
    }
  }

  // log.debug(tx, `Done parsing ${appName}`);
  return tx;
};
