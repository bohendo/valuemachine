import {
  Address,
  AddressCategories,
  emptyState,
  AddressBook,
  AssetChunk,
  AssetTypes,
  DecimalString,
  Transaction,
  Logger,
  NetWorth,
  State,
  StateBalances,
  StateJson,
  TimestampString,
} from "@finances/types";
import { math } from "@finances/utils";

import { getAddressBook } from "./addressBook";

const { add, gt, round, sub } = math;

export const getState = (
  state: StateJson = emptyState,
  givenAddressBook?: AddressBook,
  logger?: Logger,
): State => {
  const log = logger.child({ module: "State" });

  const addressBook = givenAddressBook || getAddressBook(
    Object.keys(state.accounts).map(address => ({
      name: address.substring(0, 10),
      address,
      category: AddressCategories.Self,
    })),
  );

  ////////////////////////////////////////
  // Run Init Code

  for (const address of addressBook.addresses.filter(addressBook.isSelf)) {
    state.accounts[address] = state.accounts[address] || [];
  }

  ////////////////////////////////////////
  // Internal Functions

  const getNextChunk = (account: Address, assetType: AssetTypes): AssetChunk => {
    const index = state.accounts[account].findIndex(chunk => chunk.assetType === assetType);
    if (index === -1) return undefined;
    return state.accounts[account].splice(index, 1)[0];
  };

  ////////////////////////////////////////
  // Exported Functions

  const toJson = (): StateJson => state;

  const putChunk = (account: Address, chunk: AssetChunk): void => {
    if (["BTC", "INR", "LTC", "USD"].includes(chunk.assetType) || !addressBook.isSelf(account)) {
      log.debug(`Skipping off-chain or external asset put`);
      return;
    }
    log.debug(`Putting ${chunk.quantity} ${chunk.assetType} into account ${account}`);
    state.accounts[account].push(chunk);
    state.accounts[account].sort((chunk1, chunk2) =>
      new Date(chunk1.dateRecieved).getTime() - new Date(chunk2.dateRecieved).getTime(),
    );
  };

  const getChunks = (
    account: Address,
    assetType: AssetTypes,
    quantity: DecimalString,
    transaction: Transaction,
  ): AssetChunk[] => {
    if (assetType === "USD") {
      log.debug(`Printing more USD`); // Everyone has infinite USD in the value machine
      return [{ assetType, dateRecieved: new Date(0).toISOString(), purchasePrice: "1", quantity }];
    }
    // We assume nothing about the history of chunks coming to us from the outside
    if (!addressBook.isSelf(account)) {
      return [{
        assetType,
        dateRecieved: transaction.date,
        purchasePrice: transaction.prices[assetType],
        quantity,
      }];
    }
    log.debug(`Getting chunks totaling ${quantity} ${assetType} from ${account}`);
    const output = [];
    let togo = quantity;
    while (gt(togo, "0")) {
      const chunk = getNextChunk(account, assetType);
      log.debug(chunk, `Got next chunk of ${assetType} w ${togo} to go`);
      if (!chunk) {
        output.forEach(chunk => putChunk(account, chunk)); // roll back changes so far
        throw new Error(`${account} attempted to spend ${quantity} ${
          assetType
        } but they are missing ${togo}. All chunks: ${JSON.stringify(output)}.`);
      }
      if (gt(chunk.quantity, togo)) {
        putChunk(account, { ...chunk, quantity: sub(chunk.quantity, togo) });
        output.push({ ...chunk, quantity: togo });
        return output;
      }
      output.push(chunk);
      togo = sub(togo, chunk.quantity);
      log.debug(`Put ${chunk.quantity} into output, ${togo} to go`);
    }
    return output;
  };

  const getBalance = (account: Address, assetType: AssetTypes): DecimalString =>
    !addressBook.isSelf(account)
      ? "0"
      : state.accounts[account]
        .filter(chunk => chunk.assetType === assetType)
        .reduce((sum, chunk) => add(sum, chunk.quantity), "0");

  const getRelevantBalances = (transaction: Transaction): StateBalances => {
    const simpleState = {} as StateBalances;
    const accounts = transaction.transfers.reduce((acc, cur) => {
      addressBook.isSelf(cur.to) && acc.push(cur.to);
      addressBook.isSelf(cur.from) && acc.push(cur.from);
      return acc;
    }, []);
    for (const account of accounts) {
      simpleState[account] = {};
      const assetTypes = transaction.transfers.reduce((acc, cur) => {
        acc.push(cur.assetType);
        return acc;
      }, []);
      for (const assetType of assetTypes) {
        simpleState[account][assetType] = round(getBalance(account, assetType), 8);
      }
    }
    return simpleState;
  };

  const getAllBalances = (): StateBalances => {
    const output = {} as StateBalances;
    for (const account of Object.keys(state.accounts)) {
      const assetTypes = state.accounts[account].reduce((acc, cur) => {
        if (!acc.includes(cur.assetType)) {
          acc.push(cur.assetType);
        }
        return acc;
      }, []);
      for (const assetType of assetTypes) {
        output[account] = output[account] || {};
        output[account][assetType] = getBalance(account, assetType);
      }
    }
    return output;
  };

  const getNetWorth = (): NetWorth => {
    const output = {};
    const allBalances = getAllBalances();
    for (const account of Object.keys(allBalances)) {
      for (const assetType of Object.keys(allBalances[account])) {
        output[assetType] = output[assetType] || "0";
        output[assetType] = add(output[assetType], allBalances[account][assetType]);
      }
    }
    return output;
  };

  const touch = (lastUpdated: TimestampString): void => {
    state.lastUpdated = lastUpdated;
  };

  return {
    getAllBalances,
    getBalance,
    getChunks,
    getNetWorth,
    getRelevantBalances,
    putChunk,
    toJson,
    touch,
  };
};
