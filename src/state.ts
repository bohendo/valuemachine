import { env } from "./env";
import {
  Address,
  AddressBook,
  AssetChunk,
  AssetTypes,
  DecimalString,
  Event,
  NetWorth,
  State,
  StateBalances,
  StateJson,
} from "./types";
import { add, gt, Logger, round, sub } from "./utils";

export const getState = (addressBook: AddressBook, oldState: State): State => {
  const log = new Logger("State", env.logLevel);

  ////////////////////////////////////////
  // Run Init Code

  const stateJson = oldState ? oldState.toJson() : {};
  const state = {} as StateJson;
  for (const address of addressBook.addresses.filter(addressBook.isSelf)) {
    state[address] = stateJson[address] || [];
  }

  ////////////////////////////////////////
  // Internal Functions

  // TODO: implement FIFO/HIFO/LIFO
  const getNextChunk = (account: Address, assetType: AssetTypes): AssetChunk => {
    const index = state[account].findIndex(chunk => chunk.assetType === assetType);
    return state[account].splice(index, 1)[0];
  };

  ////////////////////////////////////////
  // Exported Functions

  const toJson = (): StateJson => JSON.parse(JSON.stringify(state));

  const putChunk = (account: Address, chunk: AssetChunk): void => {
    if (["BTC", "INR", "LTC", "USD"].includes(chunk.assetType) || !addressBook.isSelf(account)) {
      log.debug(`Skipping off-chain or external asset put`);
      return;
    }
    log.debug(`Putting ${chunk.quantity} ${chunk.assetType} into account ${account}`);
    state[account].unshift(chunk);
  };

  const getChunks = (
    account: Address,
    assetType: AssetTypes,
    quantity: DecimalString,
    event: Event,
  ): AssetChunk[] => {
    if (assetType === "USD") {
      log.debug(`Printing more USD`); // Everyone has infinite USD in the value machine
      return [{ assetType, dateRecieved: new Date(0).toISOString(), purchasePrice: "1", quantity }];
    }
    // We assume nothing about the history of chunks coming to us from the outside
    if (!addressBook.isSelf(account)) {
      return [{
        assetType,
        dateRecieved: event.date,
        purchasePrice: event.prices[assetType],
        quantity,
      }];
    }
    log.debug(`Getting chunks totaling ${quantity} ${assetType} from ${account}`);
    const output = [];
    let togo = quantity;
    while (gt(togo, "0")) {
      const chunk = getNextChunk(account, assetType);
      log.debug(`Checking out chunk w ${togo} to go: ${JSON.stringify(chunk, null, 2)}`);
      if (!chunk) {
        throw new Error(`${account} attempted to spend more ${assetType} than they received.`);
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
      : state[account]
        .filter(chunk => chunk.assetType === assetType)
        .reduce((sum, chunk) => add([sum, chunk.quantity]), "0");

  const getRelevantBalances = (event: Event): StateBalances => {
    const simpleState = {} as StateBalances;
    const accounts = event.transfers.reduce((acc, cur) => {
      addressBook.isSelf(cur.to) && acc.push(cur.to);
      addressBook.isSelf(cur.from) && acc.push(cur.from);
      return acc;
    }, []);
    for (const account of accounts) {
      simpleState[account] = {};
      const assetTypes = event.transfers.reduce((acc, cur) => {
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
    for (const account of Object.keys(state)) {
      const assetTypes = state[account].reduce((acc, cur) => {
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
        output[assetType] = add([output[assetType], allBalances[account][assetType]]);
      }
    }
    return output;
  };

  return {
    getAllBalances,
    getBalance,
    getChunks,
    getNetWorth,
    getRelevantBalances,
    putChunk,
    toJson,
  };
};
