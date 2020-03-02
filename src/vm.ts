import { env } from "./env";
import {
  AddressBook,
  AssetChunk,
  AssetType,
  DecimalString,
  Event,
  Log,
  State,
} from "./types";
import { add, eq, gt, Logger, sub } from "./utils";

export const getValueMachine = (addressBook: AddressBook): any => {
  const log = new Logger("ValueMachine", env.logLevel);
  const { isSelf, pretty } = addressBook;

  const noValueError = (account: string, assetType: string): string =>
    `${account} attempted to spend more ${assetType} than they had.`;

  // TODO: what if input.capitalGainsMethod is LIFO or HIFO?
  const getPutChunk = (state: State) =>
    (account: string, assetType: string, asset: AssetChunk): void => {
      if (assetType === "USD" || !isSelf(account)) {
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
    (account: string, assetType: AssetType, quantity: DecimalString): AssetChunk[] => {
      // Everyone has infinite USD in the value machine
      if (assetType === "USD") {
        return [{ dateRecieved: "1970-01-01T00:00:00.000Z", purchasePrice: "1", quantity }];
      }
      // We assume nothing about the history of chunks coming to us from the outside
      if (!isSelf(account)) {
        return [{
          dateRecieved: event.date,
          purchasePrice: event.prices[assetType],
          quantity,
        }];
      }
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
          return output;
        }
        output.push({ ...chunk, quantity: chunk.quantity });
        togo = sub(togo, chunk.quantity);
        log.debug(`Put ${chunk.quantity} into output, ${togo} to go`);
      }
      return output;
    };

  return (oldState: State | null, event: Event): [State, Log] => {
    log.info(`${event.date} ${event.description}`);
    const state = JSON.parse(JSON.stringify(oldState || {})) as State;
    log.debug(`Applying event ${JSON.stringify(event, null, 2)} to state ${JSON.stringify(state, null, 2)}`);
    const logs = [];
    const [getChunks, putChunk] = [getGetChunk(state, event), getPutChunk(state)];

    for (const { assetType, from, quantity, to } of event.transfers) {
      log.info(`transfering ${quantity} ${assetType} from ${pretty(from)} to ${pretty(to)}`);

      const chunks = getChunks(from, assetType, quantity);

      log.debug(`got chunks ${JSON.stringify(chunks)}`);

      const total = chunks.reduce((sum, chunk) => add([sum, chunk.quantity]), "0");

      if (!eq(total, quantity)) {
        throw new Error(`getChunk got ${total} but expected ${quantity}`);
      }

      chunks.forEach(chunk => putChunk(to, assetType, chunk));
    }

    return [state, logs];
  };
};
