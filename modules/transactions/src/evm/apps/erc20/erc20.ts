import { AddressZero } from "@ethersproject/constants";
import { formatUnits } from "@ethersproject/units";
import {
  AddressBook,
  Asset,
  EvmMetadata,
  EvmTransaction,
  Logger,
  Transaction,
  TransferCategories,
} from "@valuemachine/types";

import { parseEvent } from "../utils";

export const appName = "ERC20";

const { Expense, Income, Internal, Unknown } = TransferCategories;

////////////////////////////////////////
/// ABIs

const erc20Abi = [
  "event Approval(address indexed from, address indexed to, uint amount)",
  "event Transfer(address indexed from, address indexed to, uint amount)",
];

////////////////////////////////////////
/// Parser

export const erc20Parser = (
  tx: Transaction,
  evmTx: EvmTransaction,
  evmMeta: EvmMetadata,
  addressBook: AddressBook,
  logger: Logger,
): Transaction => {
  const log = logger.child({ module: `${appName}:${evmTx.hash.substring(0, 6)}` });
  const { getDecimals, getName, isSelf, isToken } = addressBook;

  for (const txLog of evmTx.logs) {
    const address = txLog.address;
    // Only parse known, ERC20 compliant tokens
    if (isToken(address)) {
      const event = parseEvent(erc20Abi, txLog, evmMeta);
      if (!event.name) continue;
      tx.apps.push(appName);
      const asset = getName(address) as Asset;
      // Skip transfers that don't concern self accounts
      if (!isSelf(event.args.from) && !isSelf(event.args.to)) {
        log.debug(`Skipping ${asset} ${event.name} that doesn't involve us (${event.args.to})`);
        continue;
      }
      const amount = formatUnits(event.args.amount, getDecimals(address));

      if (event.name === "Transfer") {
        log.info(`Parsing ${appName} ${event.name} of ${amount} ${asset}`);
        const from = event.args.from.endsWith(AddressZero) ? address : event.args.from;
        const to = event.args.to.endsWith(AddressZero) ? address : event.args.to;
        const category = isSelf(from) && isSelf(to) ? Internal
          : isSelf(from) && !isSelf(to) ? Expense
          : isSelf(to) && !isSelf(from) ? Income
          : Unknown;
        tx.transfers.push({ asset, category, from, index: txLog.index, quantity: amount, to });
        if (evmTx.to === address) {
          tx.method = `${asset} ${event.name}`;
        }

      } else if (event.name === "Approval") {
        log.debug(`Parsing ${appName} ${event.name} event for ${asset}`);
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
