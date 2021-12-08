import { AddressZero } from "@ethersproject/constants";
import { formatUnits } from "@ethersproject/units";
import { Asset, Logger } from "@valuemachine/types";

import { AddressBook, Transaction } from "../../../types";
import { EvmMetadata, EvmTransaction } from "../../types";
import { Apps, Methods } from "../../enums";
import { getTransferCategory, parseEvent } from "../../utils";

const appName = Apps.Token;

////////////////////////////////////////
/// ABIs

const tokenAbi = [
  "event Approval(address indexed from, address indexed to, uint amount)",
  "event Transfer(address indexed from, address indexed to, uint amount)",
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
  const { getDecimals, getName, isToken } = addressBook;

  for (const txLog of evmTx.logs) {
    const address = txLog.address;
    const index = txLog.index;
    // Only parse known, ERC20 compliant tokens
    if (isToken(address)) {
      const event = parseEvent(tokenAbi, txLog, evmMeta);
      if (!event.name) continue;
      tx.apps.push(appName);
      const asset = getName(address) as Asset;
      // Skip transfers that don't concern self accounts
      const amount = formatUnits(event.args.amount, getDecimals(address));

      if (event.name === "Transfer") {
        const from = event.args.from.endsWith(AddressZero) ? address : event.args.from;
        const to = event.args.to.endsWith(AddressZero) ? address : event.args.to;
        log.debug(`Parsing ${appName} ${event.name} #${index} of ${amount} ${asset} from ${
          from.substring(0, from.length - 30)
        }.. to ${
          to.substring(0, to.length - 30)
        }..`);
        tx.transfers.push({
          amount: amount,
          asset,
          category: getTransferCategory(from, to, addressBook),
          from,
          index,
          to,
        });
        if (evmTx.to === address) {
          tx.method = `${asset} ${Methods.Transfer}`;
        }

      } else if (event.name === "Approval") {
        log.debug(`Parsing ${appName} ${event.name} event for ${asset}`);
        if (evmTx.to === address) {
          tx.method = `${asset} ${Methods.Approval}`;
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
