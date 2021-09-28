import {
  AddressBook,
  EvmMetadata,
  EvmTransaction,
  Logger,
  Transaction,
  TransferCategories,
} from "@valuemachine/types";
import {
  mul,
  sub,
} from "@valuemachine/utils";

import { addresses, mixerAddresses } from "./addresses";
import { apps } from "./enums";

const appName = apps.Tornado;

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
  ? mul("10", "0." + "0".repeat(amt.match(/0.0*/)[0].length - 2) + "1")
  : "1" + "0".repeat(amt.split(".")[0].length);

export const coreParser = (
  tx: Transaction,
  evmTx: EvmTransaction,
  evmMeta: EvmMetadata,
  addressBook: AddressBook,
  logger: Logger,
): Transaction => {
  const log = logger.child({ module: `${appName}:${evmTx.hash.substring(0, 6)}` });
  const { isSelf } = addressBook;

  let isTornadoTx = false;

  // NOTE: if we want to figure out which pool we're mixing in, we'll have to compare amounts
  // The tx itself appears to have no info re the target pool

  tx.transfers.filter(transfer =>
    isSelf(transfer.from)
      && mixerAddresses.some(e => transfer.to === e.address)
      && ([Expense, Internal] as string[]).includes(transfer.category)
  ).forEach(deposit => {
    isTornadoTx = true;
    deposit.category = Internal;
    deposit.to = appName;
    tx.method = "Deposit";
    log.info(`Found ${appName} ${tx.method}`);
  });

  tx.transfers.filter(transfer =>
    isSelf(transfer.to)
      && mixerAddresses.some(e => transfer.from === e.address)
      && ([Income, Internal] as string[]).includes(transfer.category)
  ).forEach(withdraw => {
    isTornadoTx = true;
    withdraw.category = Internal;
    withdraw.from = appName;
    withdraw.index = withdraw.index || 1;
    const total = closestTenPow(withdraw.amount);
    const asset = withdraw.asset;
    tx.transfers.push({
      asset,
      category: Fee,
      index: 0,
      from: appName,
      amount: sub(total, withdraw.amount),
      to: relayerAddress,
    });
    tx.method = "Withdraw";
    log.info(`Found ${appName} ${tx.method}`);
  });

  if (isTornadoTx) {
    tx.apps.push(appName);
  }

  // log.debug(tx, `Done parsing ${appName}`);
  return tx;
};


export const parsers = { insert: [], modify: [coreParser] };
