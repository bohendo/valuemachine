import { Logger } from "@valuemachine/types";
import { dedup } from "@valuemachine/utils";

import { TransferCategories } from "../../../enums";
import { AddressBook, Transaction } from "../../../types";
import { insertVenue } from "../../../utils";
import { Apps, Methods } from "../../enums";
import { EvmMetadata, EvmTransaction } from "../../types";
import { parseEvent } from "../../utils";

import { addresses } from "./addresses";

const appName = Apps.Idex;

const idexAbi = [
  "event Order(address tokenBuy, uint256 amountBuy, address tokenSell, uint256 amountSell, uint256 expires, uint256 nonce, address user, uint8 v, bytes32 r, bytes32 s)",
  "event Cancel(address tokenBuy, uint256 amountBuy, address tokenSell, uint256 amountSell, uint256 expires, uint256 nonce, address user, uint8 v, bytes32 r, bytes32 s)",
  "event Trade(address tokenBuy, uint256 amountBuy, address tokenSell, uint256 amountSell, address get, address give)",
  "event Deposit(address token, address user, uint256 amount, uint256 balance)",
  "event Withdraw(address token, address user, uint256 amount, uint256 balance)",
];

// Keeps track of which accounts have deposited which asset types
const depositedAssets = {} as { [account: string]: string[] };

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
      const account = insertVenue(event.args.user, appName);
      // Trade events never occur so we don't need to parse events w/out a user arg
      if (!event.args.user || !addressBook.isSelf(event.args.user)) continue;

      if (event.name === "Deposit") {
        log.info(`Found ${event.name} to ${account}`);
        const deposit = tx.transfers.find(transfer =>
          transfer.from === event.args.user && transfer.to === address
        );
        if (deposit) {
          if (evmTx.to === address) tx.method = `${appName} ${Methods.Deposit}`;
          deposit.category = TransferCategories.Internal;
          deposit.to = account;
          depositedAssets[account] = depositedAssets[account] || [];
          depositedAssets[account] = dedup([...depositedAssets[account], deposit.asset]);
          log.info(`${account} has deposited: [${depositedAssets[account].join(",")}]`);
        }

      } else if (event.name === "Withdraw") {
        log.info(`Found ${event.name} from ${account}`);
        const withdraw = tx.transfers.find(transfer =>
          transfer.to === event.args.user && transfer.from === address
        );
        if (withdraw) {
          tx.method = Methods.Withdraw; // first guess, this will be overwritten if we find a trade
          withdraw.category = TransferCategories.Internal;
          withdraw.from = account;
          if (!depositedAssets[account]?.length) {
            log.warn(`${account} is withdrawing from ${appName} before we've found any deposits`);
            continue;
          }
          // Inject swaps in & out
          log.info(`Assuming ${account} traded all of their deposited ${
            depositedAssets[account].join()
          } for ${withdraw.amount} ${withdraw.asset}`);
          depositedAssets[account].forEach((depositedAsset, i) => {
            tx.transfers.push({
              asset: depositedAsset,
              amount: "ALL",
              category: TransferCategories.SwapOut,
              from: account,
              index: txLog.index + i,
              to: address,
            });
          });
          tx.transfers.push({
            asset: withdraw.asset,
            amount: withdraw.amount,
            category: TransferCategories.SwapIn,
            from: address,
            index: txLog.index + depositedAssets[account].length,
            to: account,
          });
          withdraw.index = txLog.index + depositedAssets[account].length + 1;
          tx.method = Methods.Trade;
        }
      }

    }
  }

  return tx;
};

export const parsers = { insert: [], modify: [coreParser] };
