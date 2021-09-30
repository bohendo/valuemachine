import { AddressZero } from "@ethersproject/constants";
import {
  AddressBook,
  EvmMetadata,
  EvmTransaction,
  Logger,
  Transaction,
} from "@valuemachine/types";

import { Apps, Methods } from "../../enums";
import { getTransferCategory, parseEvent } from "../../utils";

import { addresses } from "./addresses";

const appName = Apps.CryptoKitties;

// const { Income, Internal, SwapIn, SwapOut, Borrow, Repay } = TransferCategories;

const cryptokittyAbi = [
  "event Approval(address owner, address approved, uint256 tokenId)",
  "event Birth(address owner, uint256 kittyId, uint256 matronId, uint256 sireId, uint256 genes)",
  "event ContractUpgrade(address newContract)",
  "event Pregnant(address owner, uint256 matronId, uint256 sireId, uint256 cooldownEndBlock)",
  "event Transfer(address from, address to, uint256 tokenId)",
];

const coreParser = (
  tx: Transaction,
  evmTx: EvmTransaction,
  evmMeta: EvmMetadata,
  addressBook: AddressBook,
  logger: Logger,
): Transaction => {
  const log = logger.child({ module: `${appName}:${evmTx.hash.substring(0, 6)}` });

  for (const txLog of evmTx.logs) {
    const address = txLog.address;
    if (addresses.some(e => e.address === address)) {
      const event = parseEvent(cryptokittyAbi, txLog, evmMeta);
      if (!event?.name) continue;
      tx.apps.push(appName);
      log.info(`Found ${appName} ${event.name}`);
      if (event.name === "Pregnant") {
        tx.method = Methods.Breed;
      } else if (event.name === "Transfer") {
        const asset = `${addressBook.getName(address)}_${event.args.tokenId}`;
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
        const asset = `${addressBook.getName(address)}_${event.args.tokenId}`;
        if (evmTx.to === address) {
          tx.method = `${asset} ${event.name}`;
        }
      }
    }
  }

  return tx;
};

export const parsers = { insert: [], modify: [coreParser] };
