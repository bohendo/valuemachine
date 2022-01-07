import { Logger } from "@valuemachine/types";
import { math } from "@valuemachine/utils";

import { TransferCategories } from "../../../enums";
import { AddressBook, Transaction } from "../../../types";
import { EvmMetadata, EvmTransaction } from "../../types";
import { Apps } from "../../enums";

import { addresses, mixerAddresses } from "./addresses";

const appName = Apps.Tornado;

const { Income, Expense, Fee, Internal } = TransferCategories;

////////////////////////////////////////
/// Addresses

const relayer = "TornadoRelayer";

const relayerAddress = addresses.find(e => e.name === relayer).address;

////////////////////////////////////////
/// ABIs
////////////////////////////////////////
/// Parser

// Eg "0.088" => "0.1", "8.9" => "10"
const closestTenPow = amt => amt.startsWith("0.")
  ? math.mul("10", "0." + "0".repeat(amt.match(/0.0*/)[0].length - 2) + "1")
  : "1" + "0".repeat(amt.split(".")[0].length);

export const coreParser = (
  tx: Transaction,
  evmTx: EvmTransaction,
  evmMeta: EvmMetadata,
  addressBook: AddressBook,
  logger: Logger,
): Transaction => {
  const log = logger.child({ name: `${appName}:${evmTx.hash.substring(0, 6)}` });
  const { isSelf } = addressBook;
  const account = `${evmMeta.name}/${appName}`;

  // NOTE: if we want to figure out which pool we're mixing in, we'll have to compare amounts
  // The tx itself appears to have no info re the target pool

  tx.transfers.filter(transfer =>
    isSelf(transfer.from)
      && mixerAddresses.some(e => transfer.to === e.address)
      && ([Expense, Internal] as string[]).includes(transfer.category)
  ).forEach(deposit => {
    deposit.category = Internal;
    deposit.to = account;
    tx.method = "Deposit";
    tx.apps.push(appName);
    log.info(`Found ${account} ${tx.method}`);
  });

  tx.transfers.filter(transfer =>
    isSelf(transfer.to)
      && mixerAddresses.some(e => transfer.from === e.address)
      && ([Income, Internal] as string[]).includes(transfer.category)
  ).forEach(withdraw => {
    withdraw.category = Internal;
    withdraw.from = account;
    withdraw.index = withdraw.index || 1;
    const total = closestTenPow(withdraw.amount);
    const asset = withdraw.asset;
    tx.transfers.push({
      asset,
      category: Fee,
      index: 0,
      from: account,
      amount: math.sub(total, withdraw.amount),
      to: relayerAddress,
    });
    tx.method = "Withdraw";
    tx.apps.push(appName);
    log.info(`Found ${account} ${tx.method}`);
  });

  return tx;
};


export const parsers = { insert: [], modify: [coreParser] };
