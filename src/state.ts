import { env } from "./env";
import {
  Address,
  AddressBook,
  AssetChunk,
  AssetTypes,
  DecimalString,
  Event,
  State,
  StateBalances,
  StateJson,
} from "./types";
import { add, gt, Logger, round, sub } from "./utils";

export const getState = (addressBook: AddressBook, stateJson?: StateJson): State => {
  const log = new Logger("State", env.logLevel);

  ////////////////////////////////////////
  // Run Init Code

  const state = {} as StateJson;
  for (const address of addressBook.addresses.filter(addressBook.isSelf)) {
    state[address] = (stateJson && stateJson[address]) ? stateJson[address] : [];
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
    log.info(`Putting ${chunk.quantity} ${chunk.assetType} into account ${account}`);
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
    log.info(`Getting chunks totaling ${quantity} ${assetType} from ${account}`);
    const output = [];
    let togo = quantity;
    while (gt(togo, "0")) {
      const chunk = getNextChunk(account, assetType);
      log.info(`Checking out chunk w ${togo} to go: ${JSON.stringify(chunk, null, 2)}`);
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

  return {
    getBalance,
    getChunks,
    getRelevantBalances,
    putChunk,
    toJson,
  };
};
