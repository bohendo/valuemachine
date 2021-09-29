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

import { Apps } from "../../enums";
import { getTransferCategory, parseEvent } from "../../utils";

import {
  tubAddress,
  pethAddress,
  factoryAddresses,
  tokenAddresses,
} from "./addresses";

const appName = Apps.Maker;

const { SwapIn, SwapOut, Borrow, Repay, Noop } = TransferCategories;

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
  "function setOwner(address owner)",
  "function execute(address target, bytes data) payable returns (bytes32 response)",
  "function execute(bytes code, bytes data) payable returns (address target, bytes32 response)",
  "function cache() view returns (address)",
  "function setAuthority(address authority)",
  "function owner() view returns (address)",
  "function setCache(address cacheAddr) returns (bool)",
  "function authority() view returns (address)",
  "constructor(address cacheAddr)",
  "event LogNote(bytes4 indexed sig, address indexed guy, bytes32 indexed foo, bytes32 indexed bar, uint256 wad, bytes fax) anonymous",
  "event LogSetAuthority(address indexed authority)",
  "event LogSetOwner(address indexed owner)",
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
  const { getDecimals, getName } = addressBook;
  // log.debug(tx, `Parsing in-progress tx`);

  // Process proxy interactions & save a list of relevant proxies to treat as self
  const proxies = [];
  for (const txLog of evmTx.logs) {
    const address = txLog.address;
    if (factoryAddresses.some(e => address === e.address)) {
      const event = parseEvent(proxyAbi, txLog, evmMeta);
      if (event?.name === "Created") {
        tx.method = "Proxy Creation";
        tx.apps.push(appName);
      }
    } else if (txLog.topics[0].startsWith("0x1cff79cd")) { // TODO: hash sig instead of hardcoding?
      log.info(`found a new proxy address: ${address}`);
      proxies.push(address);
    }
  }

  // If we sent this evmTx, replace proxy addresses w tx origin
  if (addressBook.isSelf(evmTx.from)) {
    tx.transfers.forEach(transfer => {
      if (proxies.includes(transfer.from)) {
        transfer.from = evmTx.from;
        transfer.category = getTransferCategory(transfer.from, transfer.to, addressBook);
      }
      if (proxies.includes(transfer.to)) {
        transfer.to = evmTx.from;
        transfer.category = getTransferCategory(transfer.from, transfer.to, addressBook);
      }
    });
  }

  const isSelf = address => addressBook.isSelf(address) || proxies.includes(address);

  // Process PETH/SAI/DAI mints/burns
  for (const txLog of evmTx.logs) {
    const address = txLog.address;

    if (tokenAddresses.some(e => e.address === address)) {
      const asset = getName(address) as Asset;
      const event = parseEvent(tokenAbi, txLog, evmMeta);
      if (!event.name) continue;
      const wad = formatUnits(event.args.wad, getDecimals(address));

      if (event.name === "Mint") {
        log.info(`Parsing ${asset} ${event.name} of ${wad}`);
        tx.apps.push(appName);
        const guy = proxies.includes(event.args.guy) ? evmTx.from : event.args.guy;
        if (address === pethAddress) {
          tx.transfers.push({
            asset,
            category: isSelf(guy) ? SwapIn : Noop,
            from: tubAddress,
            index: txLog.index,
            amount: wad,
            to: guy,
          });
        } else {
          tx.transfers.push({
            asset,
            category: isSelf(guy) ? Borrow : Noop,
            from: addressZero, // we'll set the real value while parsing Vat events
            index: txLog.index,
            amount: wad,
            to: guy,
          });
        }

      } else if (event.name === "Burn") {
        log.info(`Parsing ${asset} ${event.name} of ${wad}`);
        tx.apps.push(appName);
        const guy = proxies.includes(event.args.guy) ? evmTx.from : event.args.guy;
        if (address === pethAddress) {
          tx.transfers.push({
            asset,
            category: isSelf(guy) ? SwapOut : Noop,
            from: guy,
            index: txLog.index,
            amount: wad,
            to: tubAddress,
          });
        } else {
          tx.transfers.push({
            asset,
            category: isSelf(guy) ? Repay : Noop,
            from: guy,
            index: txLog.index,
            amount: wad,
            to: addressZero, // we'll set the real value while parsing Vat events
          });
        }

      } else if (["Approval", "Transfer"].includes(event.name)) {
        continue; // already handled by generic erc20 parser
      } else {
        log.warn(`Unknown ${event.name} event from ${asset}`);
      }
    }
  }

  // log.debug(tx, `Done parsing ${appName}`);
  return tx;
};
