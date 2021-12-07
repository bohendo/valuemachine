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
import { insertVenue, math } from "@valuemachine/utils";

import { Apps, Assets, Methods } from "../../enums";
import { parseEvent } from "../../utils";

import { etherdeltaAddress } from "./addresses";

export const appName = Apps.EtherDelta;

const { Income, Expense, Internal, SwapIn, SwapOut } = TransferCategories;

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
    address.endsWith(AddressZero) ? Assets.ETH : getName(address);

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
        const amount = formatUnits(event.args.amount, getDecimals(event.args.token));
        log.info(`Parsing ${appName} ${event.name} of ${amount} ${asset}`);
        const transfer = tx.transfers.find(transfer =>
          ([Income, Expense, Internal] as string[]).includes(transfer.category)
          && transfer.asset === asset
          && transfer.amount === amount
        );
        if (transfer) {
          if (event.name === "Deposit") {
            transfer.category = Internal;
            transfer.to = account;
            tx.method = Methods.Deposit;
          } else {
            transfer.category = Internal;
            transfer.from = account;
            tx.method = Methods.Withdraw;
            if (math.eq(event.args.balance, "0")) {
              tx.transfers.push({
                asset: transfer.asset,
                amount: "ALL",
                category: TransferCategories.Fee,
                index: txLog.index + 1,
                from: account,
                to: address,
              });
            }
          }
        } else {
          log.warn(`Unable to find a ${appName} transfer of ${amount} ${asset}`);
        }

      } else if (event.name === "Trade") {
        log.info(`Parsing ${appName} ${event.name}`);
        tx.transfers.push({
          asset: getAsset(event.args.tokenGet),
          category: SwapOut,
          from: account,
          index,
          amount: formatUnits(event.args.amountGet, getDecimals(event.args.tokenGet)),
          to: address,
        }, {
          asset: getAsset(event.args.tokenGive),
          category: SwapIn,
          from:  address,
          index,
          amount: formatUnits(event.args.amountGive, getDecimals(event.args.tokenGive)),
          to: account,
        });
        tx.method = "Trade";

      } else {
        log.warn(event, `Skipping ${appName} ${event.name} event bc idk how to handle it`);
      }

    }
  }

  // log.debug(tx, `Done parsing ${appName}`);
  return tx;
};


export const parsers = { insert: [], modify: [coreParser] };
