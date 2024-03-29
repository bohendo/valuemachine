import { Interface } from "@ethersproject/abi";
import { Logger } from "@valuemachine/types";

import { TransferCategories } from "../../../enums";
import { AddressBook, Transaction } from "../../../types";
import { addresses as allAddresses } from "../addresses";
import { Apps, Methods, Tokens } from "../../enums";
import { EvmMetadata, EvmTransaction } from "../../types";
import { getTransferCategory, parseEvent } from "../../utils";

import {
  factoryAddresses,
  proxyAddresses,
  tubAddress,
} from "./addresses";

const appName = Apps.DSProxy;

const { SwapIn, SwapOut } = TransferCategories;
const wethAddresses = allAddresses.filter(e => e.name === Tokens.WETH).map(e => e.address);

////////////////////////////////////////
/// Abis

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

const iface = new Interface(proxyAbi);
const execSigs = Object.values(iface.functions).reduce((sigs, fn) => {
  if (fn.name.startsWith("execute")) sigs.push(iface.getSighash(fn));
  return sigs;
}, []);

////////////////////////////////////////
/// Utils

export const findDSProxies = (evmTx: EvmTransaction) => {
  const dsProxies = proxyAddresses.map(e => e.address);
  for (const txLog of evmTx.logs) {
    if (factoryAddresses.some(e => txLog.address === e.address)) {
      const event = parseEvent(proxyAbi, txLog);
      if (event?.name === "Created") {
        dsProxies.push(event.args.proxy);
      }
    } else if (execSigs.some(sig => txLog.topics[0].startsWith(sig))) {
      dsProxies.push(txLog.address);
    }
  }
  return dsProxies;
};

////////////////////////////////////////
/// Parser

export const proxyParser = (
  tx: Transaction,
  evmTx: EvmTransaction,
  evmMeta: EvmMetadata,
  addressBook: AddressBook,
  logger: Logger,
): Transaction => {
  const log = logger.child({ name: `${appName}:${evmTx.hash.substring(0, 6)}` });

  // Set method for proxy creations
  for (const txLog of evmTx.logs) {
    if (factoryAddresses.some(e => txLog.address === e.address)) {
      const event = parseEvent(proxyAbi, txLog, evmMeta);
      if (event?.name === "Created") {
        log.info(`found a newly created proxy address: ${event.args.proxy}`);
        tx.method = `Proxy ${Methods.Creation}`;
        tx.apps.push(appName);
      }
    } else if (execSigs.some(sig => txLog.topics[0].startsWith(sig))) {
      log.info(`found a new proxy address: ${txLog.address}`);
    }
  }

  const dsProxies = findDSProxies(evmTx);

  // If we sent this evmTx, replace proxy addresses w tx origin
  if (addressBook.isSelf(evmTx.from)) {
    tx.transfers.forEach(transfer => {
      if (dsProxies.includes(transfer.from)) {
        transfer.from = evmTx.from;
        transfer.category = getTransferCategory(transfer.from, transfer.to, addressBook);
        if ( // Tag WETH/PETH swaps
          wethAddresses.includes(transfer.to) ||
          (transfer.asset === Tokens.PETH && transfer.to === tubAddress)
        ) {
          transfer.category = SwapOut;
        }
      }
      if (dsProxies.includes(transfer.to)) {
        transfer.to = evmTx.from;
        transfer.category = getTransferCategory(transfer.from, transfer.to, addressBook);
        if ( // Tag WETH/PETH swaps
          wethAddresses.includes(transfer.from) ||
          (transfer.asset === Tokens.PETH && transfer.from === tubAddress)
        ) {
          transfer.category = SwapIn;
        }
      }
    });
  }

  return tx;
};
