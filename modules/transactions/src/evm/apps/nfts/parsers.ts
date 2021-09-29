import { AddressZero } from "@ethersproject/constants";
import {
  AddressBook,
  Asset,
  EvmMetadata,
  EvmTransaction,
  Logger,
  Transaction,
} from "@valuemachine/types";

import { Apps } from "../../enums";
import { getTransferCategory, parseEvent } from "../../utils";

const appName = Apps.NFT;

////////////////////////////////////////
/// ABIs

const nftAbi = [
  "event Approval(address owner, address approved, uint256 tokenId)",
  "event Transfer(address from, address to, uint256 tokenId)",
];

////////////////////////////////////////
/// Parser

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
      const event = parseEvent(nftAbi, txLog, evmMeta);
      log.info(`found nft: ${getName(address)}`);

      if (!event.name) continue;
      tx.apps.push(appName);
      const asset = `${getName(address)}_${event.args.tokenId}` as Asset;
      log.debug(`Parsing ${appName} ${event.name} for asset ${asset}`);
      // Skip transfers that don't concern self accounts

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
        log.info(tx.transfers[tx.transfers.length - 1], "Added new transfer");
        if (evmTx.to === address) {
          tx.method = `${asset} ${event.name}`;
        }

      } else if (event.name === "Approval") {
        if (evmTx.to === address) {
          tx.method = `${asset} ${event.name}`;
        }

      } else {
        log.warn(event, `Unknown ${asset} event`);
      }

    }
  }

  // log.debug(tx, `Done parsing ${appName}`);
  return tx;
};

export const parsers = { insert: [coreParser], modify: [] };
