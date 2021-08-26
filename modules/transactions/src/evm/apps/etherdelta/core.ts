import { AddressZero } from "@ethersproject/constants";
import { formatUnits } from "@ethersproject/units";
import {
  Account,
  AddressBook,
  Asset,
  EvmMetadata,
  EvmTransaction,
  Logger,
  Transaction,
  TransferCategories,
} from "@valuemachine/types";
import {
  insertVenue,
} from "@valuemachine/utils";

import { EvmAssets } from "../../enums";
import { parseEvent } from "../utils";

import { etherdeltaAddress } from "./addresses";
import { apps } from "./enums";

export const appName = apps.EtherDelta;

const { Income, Expense, Deposit, Withdraw, SwapIn, SwapOut } = TransferCategories;

////////////////////////////////////////
/// ABIs

const etherdeltaAbi = [
  "event Order(address tokenGet, uint256 amountGet, address tokenGive, uint256 amountGive, uint256 expires, uint256 nonce, address user)",
  "event Cancel(address tokenGet, uint256 amountGet, address tokenGive, uint256 amountGive, uint256 expires, uint256 nonce, address user, uint8 v, bytes32 r, bytes32 s)",
  "event Trade(address tokenGet, uint256 amountGet, address tokenGive, uint256 amountGive, address get, address give)",
  "event Deposit(address token, address user, uint256 amount, uint256 balance)",
  "event Withdraw(address token, address user, uint256 amount, uint256 balance)"
];

////////////////////////////////////////
/// Parser

export const coreParser = (
  tx: Transaction,
  evmTx: EvmTransaction,
  evmMeta: EvmMetadata,
  addressBook: AddressBook,
  logger: Logger,
): Transaction => {
  const log = logger.child({ module: `${appName}:${evmTx.hash.substring(0, 6)}` });

  const { getDecimals, getName, isSelf } = addressBook;

  const getAsset = (address: Account): Asset =>
    address.endsWith(AddressZero) ? EvmAssets.ETH : getName(address);

  for (const txLog of evmTx.logs) {
    const address = txLog.address;
    if (address === etherdeltaAddress) {
      const index = txLog.index || 1;
      const event = parseEvent(etherdeltaAbi, txLog, evmMeta);
      if (!event.name) continue;
      // Skip transfers that don't concern self accounts
      const user = [event.args.user, event.args.get, event.args.give].reduce(
        (acc, cur) => acc || (isSelf(cur) ? cur : undefined),
        undefined,
      );
      if (!user) {
        log.debug(`Skipping ${appName} ${event.name} that doesn't involve us`);
        continue;
      }
      tx.apps.push(appName);
      const account = insertVenue(user, appName);

      if (event.name === "Deposit" || event.name === "Withdraw") {
        const asset = getAsset(event.args.token);
        const quantity = formatUnits(event.args.amount, getDecimals(event.args.token));
        log.info(`Parsing ${appName} ${event.name} of ${quantity} ${asset}`);
        const transfer = tx.transfers.find(transfer =>
          ([Income, Expense, Deposit, Withdraw] as string[]).includes(transfer.category)
          && transfer.asset === asset
          && transfer.quantity === quantity
        );
        if (transfer) {
          if (event.name === "Deposit") {
            transfer.category = Deposit;
            transfer.to = account;
            tx.method = event.name;
          } else {
            transfer.category = Withdraw;
            transfer.from = account;
            tx.method = event.name;
          }
        } else {
          log.warn(`Unable to find a ${appName} transfer of ${quantity} ${asset}`);
        }

      } else if (event.name === "Trade") {
        log.info(`Parsing ${appName} ${event.name}`);
        const swapOut = {
          asset: getAsset(event.args.tokenGet),
          category: SwapOut,
          from: account,
          index,
          quantity: formatUnits(event.args.amountGet, getDecimals(event.args.tokenGet)),
          to: appName,
        };
        const swapIn = {
          asset: getAsset(event.args.tokenGive),
          category: SwapIn,
          from:  appName,
          index,
          quantity: formatUnits(event.args.amountGive, getDecimals(event.args.tokenGiv)),
          to: account,
        };
        tx.transfers.push(swapOut);
        tx.transfers.push(swapIn);
        tx.method = "Trade";

      } else {
        log.warn(event, `Skipping ${appName} ${event.name} event bc idk how to handle it`);
      }

    }
  }

  // log.debug(tx, `Done parsing ${appName}`);
  return tx;
};

