import { AddressZero } from "@ethersproject/constants";
import {
  AddressBook,
  Asset,
  EvmMetadata,
  EvmTransaction,
  EvmTransactionLog,
  Logger,
  Transaction,
} from "@valuemachine/types";

import { Apps } from "../../enums";
import { getTransferCategory, parseEvent } from "../../utils";

import { marketParser } from "./markets";

const appName = Apps.NFT;

////////////////////////////////////////
/// ABIs

const nftAbi = [
  "event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
];

const nonstandardNftAbi1 = [
  "event Approval(address indexed owner, address indexed approved, uint256 tokenId)",
  "event Transfer(address indexed from, address indexed to, uint256 tokenId)",
];

const nonstandardNftAbi2 = [
  "event Approval(address indexed owner, address approved, uint256 tokenId)",
  "event Transfer(address indexed from, address to, uint256 tokenId)",
];

const nonstandardNftAbi3 = [
  "event Approval(address owner, address approved, uint256 tokenId)",
  "event Transfer(address from, address to, uint256 tokenId)",
];

////////////////////////////////////////
/// Parser

const parseNftEvent = (
  evmLog: EvmTransactionLog,
  evmMeta: EvmMetadata,
): { name: string; args: { [key: string]: string }; } => {
  try {
    return parseEvent(nftAbi, evmLog, evmMeta);
  } catch (e) {
    try {
      return parseEvent(nonstandardNftAbi1, evmLog, evmMeta);
    } catch (e) {
      try {
        return parseEvent(nonstandardNftAbi2, evmLog, evmMeta);
      } catch (e) {
        try {
          return parseEvent(nonstandardNftAbi3, evmLog, evmMeta);
        } catch (e) {
          throw new Error(`Evm log doesn't appear to be from an NFT`);
        }
      }
    }
  }
};

const coreParser = (
  tx: Transaction,
  evmTx: EvmTransaction,
  evmMeta: EvmMetadata,
  addressBook: AddressBook,
  logger: Logger,
): Transaction => {
  const log = logger.child({ module: `${appName}:${evmTx.hash.substring(0, 6)}` });
  const { getName, isNFT } = addressBook;

  for (const txLog of evmTx.logs) {
    const address = txLog.address;
    // Only parse known, ERC20 compliant tokens
    if (isNFT(address)) {
      const event = parseNftEvent(txLog, evmMeta);
      if (!event.name) continue;
      const asset = `${getName(address)}_${event.args.tokenId}` as Asset;
      log.debug(`Parsing ${appName} ${event.name} for asset ${asset}`);
      tx.apps.push(appName);
      if (event.name === "Transfer") {
        const from = event.args.from.endsWith(AddressZero) ? address : event.args.from;
        const to = event.args.to.endsWith(AddressZero) ? address : event.args.to;
        tx.transfers.push({
          asset,
          category: getTransferCategory(from, to, addressBook),
          from,
          index: txLog.index,
          to,
        });
        if (evmTx.to === address) {
          tx.method = `${asset} ${event.name}`;
        }

      } else if (event.name === "Approval") {
        if (evmTx.to === address) {
          tx.method = `${asset} ${event.name}`;
        }
      }

    }
  }

  return tx;
};

export const parsers = { insert: [coreParser], modify: [marketParser] };
