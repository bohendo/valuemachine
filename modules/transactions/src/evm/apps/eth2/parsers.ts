import { Logger } from "@valuemachine/types";

import { TransferCategories } from "../../../enums";
import { AddressBook, Transaction } from "../../../types";
import { Apps, Assets, Methods } from "../../enums";
import { EvmMetadata, EvmTransaction } from "../../types";
import { parseEvent } from "../../utils";

import {
  eth2DepositAddress,
} from "./addresses";

const appName = Apps.ETH2;

const eth2DepositAbi = [
  "event DepositEvent(bytes pubkey, bytes withdrawal_credentials, bytes amount, bytes signature, bytes index)",
];

const coreParser = (
  tx: Transaction,
  evmTx: EvmTransaction,
  evmMeta: EvmMetadata,
  addressBook: AddressBook,
  logger: Logger,
): Transaction => {
  const log = logger.child({ name: `${appName}:${evmTx.hash.substring(0, 6)}` });

  for (const txLog of evmTx.logs) {
    const address = txLog.address;
    if (address === eth2DepositAddress) {
      tx.apps.push(appName);
      const event = parseEvent(eth2DepositAbi, txLog, evmMeta);
      if (!event.name) continue;
      log.info(`Found ${appName} event ${event.name}`);
      if (event.name === "DepositEvent") {
        tx.transfers.filter(transfer =>
          transfer.to === address &&
          addressBook.isSelf(transfer.from) &&
          transfer.asset === Assets.ETH
        ).forEach(deposit => {
          tx.method = tx.method || `${appName} ${Methods.Deposit}`;
          deposit.to = `${evmMeta.name}/${appName}/${event.args.pubkey}`;
          deposit.category = TransferCategories.Internal;
        });
      }
    }
  }

  return tx;
};

export const parsers = { insert: [], modify: [coreParser] };
