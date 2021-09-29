import {
  AddressBook,
  EvmMetadata,
  EvmTransaction,
  Logger,
  Transaction,
} from "@valuemachine/types";

import { Apps, Methods } from "../../enums";
import { parseEvent } from "../../utils";

import { addresses } from "./addresses";

const appName = Apps.CryptoKitties;

// const { Income, Internal, SwapIn, SwapOut, Borrow, Repay } = TransferCategories;

const cryptokittyAbi = [
  "event Pregnant(address owner, uint256 matronId, uint256 sireId, uint256 cooldownEndBlock)",
  "event Transfer(address from, address to, uint256 tokenId)",
  "event Approval(address owner, address approved, uint256 tokenId)",
  "event Birth(address owner, uint256 kittyId, uint256 matronId, uint256 sireId, uint256 genes)",
  "event ContractUpgrade(address newContract)"
];

const coreParser = (
  tx: Transaction,
  evmTx: EvmTransaction,
  evmMeta: EvmMetadata,
  addressBook: AddressBook,
  logger: Logger,
): Transaction => {
  const log = logger.child({ module: `${appName}:${evmTx.hash.substring(0, 6)}` });
  log.info(`Searching for ${appName} stuff`);

  for (const txLog of evmTx.logs) {
    const address = txLog.address;
    if (addresses.some(e => e.address === address)) {
      log.info(`Found ${addressBook.getName(address)} event`);
      const event = parseEvent(cryptokittyAbi, txLog, evmMeta);
      if (!event?.name) continue;
      tx.apps.push(appName);
      log.info(`Found ${appName} ${event.name}`);
      if (event.name === "Pregnant") {
        tx.method = Methods.Breed;
      }
    }
  }

  return tx;
};

export const parsers = { insert: [], modify: [coreParser] };
