import { assertState } from "./checkpoints";
import { env } from "./env";
import {
  AddressBook,
  AssetChunk,
  AssetTypes,
  DecimalString,
  Event,
  Log,
  State,
} from "./types";
import { add, eq, gt, Logger, round, sub } from "./utils";

type SimpleState = any;

export const getValueMachine = (addressBook: AddressBook): any => {
  const log = new Logger("ValueMachine", env.logLevel);
  const { isSelf, pretty } = addressBook;

  const offTheChain = (assetType: AssetTypes): boolean =>
    ["BTC", "INR", "LTC", "USD"].includes(assetType);

  const noValueError = (account: string, assetType: string): string =>
    `${account} attempted to spend more ${assetType} than they received.`;

  // TODO: what if input.capitalGainsMethod is LIFO or HIFO?
  const getPutChunk = (state: State) =>
    (account: string, assetType: AssetTypes, asset: AssetChunk): void => {
      log.debug(`Putting ${asset.quantity} ${assetType} into account ${account}`);
      if (offTheChain(assetType) || !isSelf(account)) {
        log.debug(`Skipping off-chain or external asset put`);
        return;
      }
      if (!state[account]) {
        state[account] = {};
      }
      if (!state[account][assetType]) {
        state[account][assetType] = [];
      }
      state[account][assetType].unshift(asset);
    };

  const getGetChunk = (state: State, event: Event) =>
    (account: string, assetType: AssetTypes, quantity: DecimalString): AssetChunk[] => {
      // Everyone has infinite USD in the value machine
      if (assetType === "USD") {
        log.debug(`Printing more USD`);
        return [{ dateRecieved: "1970-01-01T00:00:00.000Z", purchasePrice: "1", quantity }];
      }
      log.debug(`Getting chunks totaling ${quantity} ${assetType} from ${account}`);
      // We assume nothing about the history of chunks coming to us from the outside
      if (!isSelf(account)) {
        return [{
          dateRecieved: event.date,
          purchasePrice: event.prices[assetType],
          quantity,
        }];
      }
      log.debug(`Still getting chunks totaling ${quantity} ${assetType} from ${account}`);
      const putChunk = getPutChunk(state);
      if (!state[account]) {
        state[account] = {};
      }
      if (!state[account][assetType]) {
        state[account][assetType] = [];
        throw new Error(noValueError(account, assetType));
      }
      const output = [];
      let togo = quantity;
      while (gt(togo, "0")) {
        const chunk = state[account][assetType].pop();
        log.debug(`Checking out chunk w ${togo} to go: ${JSON.stringify(chunk, null, 2)}`);
        if (!chunk) {
          throw new Error(noValueError(account, assetType));
        }
        if (gt(chunk.quantity, togo)) {
          const leftovers = { ...chunk, quantity: sub(chunk.quantity, togo) };
          putChunk(account, assetType, leftovers);
          log.debug(`Putting ${leftovers.quantity} back, we're done`);
          output.push({ ...chunk, quantity: togo });
          log.debug(`Got ${output.length} chunks totaling ${quantity} ${assetType} from ${account}`);
          return output;
        }
        output.push({ ...chunk, quantity: chunk.quantity });
        togo = sub(togo, chunk.quantity);
        log.debug(`Put ${chunk.quantity} into output, ${togo} to go`);
      }
      return output;
    };

  const getGetBalance = (state: State) =>
    (account: string, assetType: AssetTypes): DecimalString =>
      !state[account]
        ? "0"
        : !state[account][assetType]
        ? "0"
        : !state[account][assetType].length
        ? "0"
        : state[account][assetType].reduce((sum, chunk) => add([sum, chunk.quantity]), "0");

  const getRelevantBalances = (state: State, event: Event): SimpleState => {
    const getBalance = getGetBalance(state);
    const simpleState = {} as SimpleState;
    const accounts = event.transfers.reduce((acc, cur) => {
      isSelf(cur.to) && acc.push(cur.to);
      isSelf(cur.from) && acc.push(cur.from);
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

  let index = 1;
  return (oldState: State | null, event: Event): [State, Log[]] => {
    const state = JSON.parse(JSON.stringify(oldState || {})) as State;
    const startingBalances = getRelevantBalances(state, event);
    log.info(`Applying event ${index++} on ${event.date}`);
    log.debug(`${event.date} Applying "${event.description}" to sub-state ${
      JSON.stringify(startingBalances, null, 2)
    }`);
    const logs = [] as Log[];
    const [getChunks, putChunk] = [getGetChunk(state, event), getPutChunk(state)];

    ////////////////////////////////////////
    // VM Core

    const later = [];
    for (const { assetType, fee, from, index, quantity, to } of event.transfers) {
      log.debug(`transfering ${quantity} ${assetType} from ${pretty(from)} to ${pretty(to)}`);
      let feeChunks;
      let chunks;
      try {
        if (fee) {
          feeChunks = getChunks(from, assetType, fee);
          log.debug(`Dropping ${feeChunks.length} chunks to cover fees of ${fee} ${assetType}`);
        }
        chunks = getChunks(from, assetType, quantity);
        chunks.forEach(chunk => putChunk(to, assetType, chunk));
      } catch (e) {
        log.warn(e.message);
        if (feeChunks) {
          feeChunks.forEach(chunk => putChunk(from, assetType, chunk));
        }
        later.push({ assetType, fee, from, index, quantity, to });
        continue;
      }
    }

    for (const { assetType, fee, from, quantity, to } of later) {
      log.debug(`transfering ${quantity} ${assetType} from ${pretty(from)} to ${pretty(to)} (attempt 2)`);
      if (fee) {
        const feeChunks = getChunks(from, assetType, fee);
        log.debug(`Dropping ${feeChunks.length} chunks to cover fees of ${fee} ${assetType}`);
      }
      const chunks = getChunks(from, assetType, quantity);
      chunks.forEach(chunk => putChunk(to, assetType, chunk));
    }

    ////////////////////////////////////////

    const endingBalances = getRelevantBalances(state, event);

    // Print & assert on state afterwards
    for (const account of Object.keys(endingBalances)) {
      for (const assetType of Object.keys(endingBalances[account])) {
        const diff = sub(endingBalances[account][assetType], startingBalances[account][assetType]);
        if (!eq(diff, "0")) {
          endingBalances[account][assetType] += ` (${gt(diff, 0) ? "+" : ""}${diff})`;
        }
      }
    }
    log.debug(`Final state after applying "${event.description}": ${
      JSON.stringify(endingBalances, null, 2)
    }\n`);

    assertState(state, event);

    return [state, logs];
  };
};
