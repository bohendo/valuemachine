import {
  AddressBook,
  EvmMetadata,
  EvmTransaction,
  Logger,
  Transaction,
  TransferCategories,
} from "@valuemachine/types";
import { insertVenue } from "@valuemachine/utils";

import { Apps, Methods } from "../../enums";
import { parseEvent } from "../../utils";

import { bjtjV1Address, bjtjV2Address } from "./addresses";

const appName = Apps.BJTJ;

const v2Abi = [
  "event Deposit(address indexed dealer, address indexed user, uint256 value)",
  "event Cashout(address indexed dealer, address indexed user, uint256 value)",
  "event Overflow(address indexed dealer, uint256 value)"
];

const coreParser = (
  tx: Transaction,
  evmTx: EvmTransaction,
  evmMeta: EvmMetadata,
  addressBook: AddressBook,
  logger: Logger,
): Transaction => {
  const log = logger.child({ module: `${appName}:${evmTx.hash.substring(0, 6)}` });

  const handleDeposit = (from: string, to: string, index?: number) => {
    tx.transfers.filter(t => t.from === from && t.to === to).forEach(deposit => {
      const account = insertVenue(from, appName);
      deposit.category = TransferCategories.Internal;
      deposit.to = account;
      if (index) deposit.index = index;
      tx.apps.push(appName);
      tx.method = Methods.Deposit;
      log.info(`Processed ${appName} ${tx.method} of ${deposit.amount} ${deposit.asset}`);
    });
  };

  const handleWithdraw = (from: string, to: string, index?: number) => {
    tx.transfers.filter(t => t.from === from && t.to === to).forEach(withdraw => {
      const account = insertVenue(to, appName);
      withdraw.from = account;
      withdraw.category = TransferCategories.Internal;
      if (index) withdraw.index = index;
      tx.apps.push(appName);
      tx.method = Methods.Withdraw;
      tx.transfers.push({
        asset: withdraw.asset,
        amount: "ALL",
        category: TransferCategories.Fee,
        index: (index || 0) + 1,
        from: account,
        to: from,
      });
      log.info(`Processed ${appName} ${tx.method} of ${withdraw.amount} ${withdraw.asset}`);
    });
  };

  if (evmTx.to === bjtjV1Address) {
    if (addressBook.isSelf(evmTx.from)) {
      handleDeposit(evmTx.from, evmTx.to, 0);
      handleWithdraw(evmTx.to, evmTx.from, 1);
    } else {
      const income = tx.transfers.find(t => t.category === TransferCategories.Income);
      if (income) {
        handleWithdraw(evmTx.to, income.to, 1);
      }
    }
  }

  for (const txLog of evmTx.logs) {
    if (txLog.address === bjtjV2Address) {
      const event = parseEvent(v2Abi, txLog, evmMeta);
      if (event?.name && event.args?.user && addressBook.isSelf(event.args.user)) {
        handleDeposit(event.args.user, txLog.address, txLog.index);
        handleWithdraw(txLog.address, event.args.user, txLog.index);
      }
    }
  }

  return tx;
};

export const parsers = { insert: [], modify: [coreParser] };
