import {
  AddressBook,
  EvmMetadata,
  EvmTransaction,
  Logger,
  Transaction,
  TransferCategories,
} from "@valuemachine/types";
import {
  insertVenue,
} from "@valuemachine/utils";

import { Apps, Methods } from "../../enums";
import { parseEvent } from "../../utils";

import { addresses } from "./addresses";

const appName = Apps.Idex;

const idexAbi = [
  "event SetOwner(address indexed previousOwner, address indexed newOwner)",
  "event Order(address tokenBuy, uint256 amountBuy, address tokenSell, uint256 amountSell, uint256 expires, uint256 nonce, address user, uint8 v, bytes32 r, bytes32 s)",
  "event Cancel(address tokenBuy, uint256 amountBuy, address tokenSell, uint256 amountSell, uint256 expires, uint256 nonce, address user, uint8 v, bytes32 r, bytes32 s)",
  "event Trade(address tokenBuy, uint256 amountBuy, address tokenSell, uint256 amountSell, address get, address give)",
  "event Deposit(address token, address user, uint256 amount, uint256 balance)",
  "event Withdraw(address token, address user, uint256 amount, uint256 balance)",
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
      const event = parseEvent(idexAbi, txLog, evmMeta);
      if (!event?.name) continue;
      tx.apps.push(appName);
      log.info(`Found ${appName} ${event.name}`);

      if (event.name === "Deposit") {
        tx.method = Methods.Deposit;
        tx.transfers.filter(transfer =>
          addressBook.isSelf(transfer.from) && transfer.to === address
        ).forEach(deposit => {
          deposit.category = TransferCategories.Internal;
          deposit.to = insertVenue(deposit.from, appName);
        });

      } else if (event.name === "Withdraw") {
        tx.method = Methods.Withdraw;
        tx.transfers.filter(transfer =>
          addressBook.isSelf(transfer.to) && transfer.from === address
        ).forEach(withdraw => {
          withdraw.category = TransferCategories.Internal;
          withdraw.from = insertVenue(withdraw.to, appName);
        });
      }

    }
  }

  return tx;
};

export const parsers = { insert: [], modify: [coreParser] };
