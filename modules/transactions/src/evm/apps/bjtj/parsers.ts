import { formatEther } from "@ethersproject/units";
import {
  AddressBook,
  EvmMetadata,
  EvmTransaction,
  Logger,
  Transaction,
  TransferCategories,
} from "@valuemachine/types";
// import { insertVenue } from "@valuemachine/utils";

import { parseEvent } from "../utils";

import { bjtjV1Address, bjtjV2Address } from "./addresses";
import { apps } from "./enums";

export const appName = apps.BJTJ;

const blackjackV1Abi = [
  "function cashout(address winner, uint256 amount)",
  "event Deposit(address indexed from, uint256 value)"
];

const blackjackV2Abi = [
  "function cashout(address winner, uint256 amount)",
  "event Deposit(address indexed dealer, address indexed from, uint256 value)",
  "event Cashout(address indexed dealer, address indexed to, uint256 value)",
  "event Overflow(address indexed dealer, uint256 value)"
];

export const coreParser = (
  tx: Transaction,
  evmTx: EvmTransaction,
  evmMeta: EvmMetadata,
  addressBook: AddressBook,
  logger: Logger,
): Transaction => {
  const log = logger.child({ module: `${appName}:${evmTx.hash.substring(0, 6)}` });
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

  for (const txLog of evmTx.logs) {
    const address = txLog.address;

    if (address === bjtjV1Address) {
      const event = parseEvent(blackjackV1Abi, txLog, evmMeta);
      if (!event.name) continue;
      tx.apps.push(appName);
      log.info(`Found a ${appName} ${event.name} event`);
      const amount = formatEther(event.args.value);
      const deposit = tx.transfers.find(transfer =>
        transfer.from === event.args.from && transfer.amount === amount
      );
      if (deposit) {
        deposit.category = TransferCategories.Internal;
        deposit.to = appAccount;
        deposit.index = "index" in deposit ? deposit.index : txLog.index;
        tx.method = "Deposit";
      } else {
        log.warn(`Couldn't find a ${appName} deposit of ${amount} ETH from ${event.args.from}`);
      }

    } else if (address === bjtjV2Address) {
      const event = parseEvent(blackjackV2Abi, txLog, evmMeta);
      if (!event.name) continue;
      tx.apps.push(appName);
      log.info(`Found a ${appName} ${event.name} event`);
      if (event.name === "Deposit") {
        const amount = formatEther(event.args.value);
        const deposit = tx.transfers.find(transfer =>
          transfer.from === event.args.from &&
          transfer.to === bjtjV2Address &&
          transfer.amount === amount
        );
        if (deposit) {
          deposit.category = TransferCategories.Internal;
          deposit.to = appAccount;
          deposit.index = "index" in deposit ? deposit.index : txLog.index;
          tx.method = "Deposit";
        }
      } else if (event.name === "Cashout") {
        const amount = formatEther(event.args.value);
        const withdraw = tx.transfers.find(transfer =>
          transfer.to === event.args.to &&
          transfer.amount === amount &&
          transfer.from === bjtjV2Address
        );
        if (withdraw) {
          withdraw.category = TransferCategories.Internal;
          withdraw.from = appAccount;
          withdraw.index = "index" in withdraw ? withdraw.index : txLog.index;
          tx.method = "Withdraw";
        }

      }

    } else {
      log.info(`Address doesn't match ${bjtjV1Address} nor ${bjtjV2Address}: ${address}`);

    }

  }

  return tx;
};

export const insert = [];
export const modify = [coreParser];
export const parsers = { insert, modify };
