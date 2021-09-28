import {
  AddressBook,
  EvmMetadata,
  EvmTransaction,
  Logger,
  Transaction,
  TransferCategories,
} from "@valuemachine/types";
// import { insertVenue } from "@valuemachine/utils";

import { bjtjV1Address, bjtjV2Address } from "./addresses";
import { apps } from "./enums";

const appName = apps.BJTJ;

const coreParser = (
  tx: Transaction,
  evmTx: EvmTransaction,
  evmMeta: EvmMetadata,
  addressBook: AddressBook,
  _logger: Logger,
): Transaction => {
  // const log = logger.child({ module: `${appName}:${evmTx.hash.substring(0, 6)}` });
  const appAccount = `${evmMeta.name}/${appName}`;

  // set transfer categories based on to/from balues
  tx.transfers.forEach(transfer => {
    if (
      [bjtjV1Address, bjtjV2Address].includes(transfer.from) && addressBook.isSelf(transfer.to)
    ) {
      tx.apps.push(appName);
      tx.method = "Withdraw";
      transfer.category = TransferCategories.Internal;
      transfer.from = appAccount;
    } else if (
      [bjtjV1Address, bjtjV2Address].includes(transfer.to) && addressBook.isSelf(transfer.from)
    ) {
      tx.apps.push(appName);
      tx.method = "Deposit";
      transfer.category = TransferCategories.Internal;
      transfer.to = appAccount;
    }
  });

  return tx;
};

export const parsers = { insert: [], modify: [coreParser] };
