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

const checkpoints = [
  {
    account: "0xada083a3c06ee526f827b43695f2dcff5c8c892b",
    assetType: "ETH",
    balance: "0",
    date: "2017-11-21T07:54:38.000Z",
  },
  {
    account: "0xada083a3c06ee526f827b43695f2dcff5c8c892b",
    assetType: "ETH",
    balance: "6",
    date: "2017-12-05T23:14:55.000Z",
  },
  {
    account: "0xada083a3c06ee526f827b43695f2dcff5c8c892b",
    assetType: "ETH",
    balance: "1.472343111572222222",
    date: "2017-12-30T15:14:53.000Z",
  },
  {
    account: "0xada083a3c06ee526f827b43695f2dcff5c8c892b",
    assetType: "ETH",
    balance: "1.102702839572222222",
    date: "2018-02-16T04:08:45.000Z",
  },
];

const assertState = (state: State, event: Event): void => {
  for (const { account, assetType, balance, date } of checkpoints) {
    if (date === event.date) {
      let actual;
      if (!state[account] || !state[account][assetType]) {
        if (!eq(balance, "0")) {
          throw new Error(`Expected accout ${account} to have ${assetType} balance of ${balance} on ${date} but got 0`);
        }
        actual = "0";
      } else {
        actual = state[account][assetType]
          .reduce((sum, chunk) => add([sum, chunk.quantity]), "0");
      }
      if (!eq(actual, balance)) {
        throw new Error(`Expected accout ${account} to have ${assetType} balance of ${balance} on ${date} but got ${actual}`);
      }
    }
  }
};

export const getValueMachine = (addressBook: AddressBook): any => {
  const log = new Logger("ValueMachine", env.logLevel);
  const { isSelf, pretty } = addressBook;

  const offTheChain = (assetType: AssetType): boolean =>
    ["BTC", "INR", "LTC", "USD"].includes(assetType);

  const noValueError = (account: string, assetType: string): string =>
    `${account} attempted to spend more ${assetType} than they received.`;

  // TODO: what if input.capitalGainsMethod is LIFO or HIFO?
  const getPutChunk = (state: State) =>
    (account: string, assetType: string, asset: AssetChunk): void => {
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

  const getGetBalance = (state: State) =>
    (account: string, assetType: AssetType): DecimalString =>
      !state[account]
        ? "0"
        : !state[account][assetType]
        ? "0"
        : !state[account][assetType].length
        ? "0"
        : state[account][assetType].reduce((sum, chunk) => add([sum, chunk.quantity]), "0");

  return (oldState: State | null, event: Event): [State, Log] => {
    log.info(`${event.date} ${event.description}`);
    const state = JSON.parse(JSON.stringify(oldState || {})) as State;
    log.debug(`Applying event ${JSON.stringify(event, null, 2)} to state ${JSON.stringify(state, null, 2)}`);
    const logs = [];
    const [getChunks, putChunk, getBalance] =
      [getGetChunk(state, event), getPutChunk(state), getGetBalance(state)];

    assertState(state, event);

    for (const { assetType, from, quantity, to } of event.transfers) {
      log.info(`transfering ${quantity} ${assetType} from ${pretty(from)} to ${pretty(to)}`);

      let startingBalance = getBalance(from, assetType);
      if (isSelf(from) && isSelf(to)) {
        log.debug(`Starting ${assetType} balances | sender ${startingBalance} | recipient ${getBalance(to, assetType)}`);
      } else if (isSelf(from)) {
        log.debug(`Starting ${assetType} balances | sender ${startingBalance} | recipient external`);
      } else if (isSelf(to)) {
        log.debug(`Starting ${assetType} balances | sender external | recipient ${getBalance(to, assetType)}`);
      } else {
        log.debug(`Skipping external-to-external transfer`);
        continue;
      }


      const chunks = getChunks(from, assetType, quantity);
      let endingBalance = getBalance(from, assetType);
      let balanceDiff = sub(startingBalance, endingBalance);

      log.debug(`got chunks ${JSON.stringify(chunks)}`);

      const total = chunks.reduce((sum, chunk) => add([sum, chunk.quantity]), "0");

      if (!eq(total, quantity)) {
        throw new Error(`getChunk got total of ${total} ${assetType} but expected ${quantity}`);
      }

      if (!offTheChain(assetType) && isSelf(from) && !eq(quantity, balanceDiff)) {
        throw new Error(`Expected sender ${assetType} balance to decrease by ${quantity} but got ${balanceDiff}`);
      }

      startingBalance = getBalance(to, assetType);
      chunks.forEach(chunk => putChunk(to, assetType, chunk));
      endingBalance = getBalance(to, assetType);
      balanceDiff = sub(endingBalance, startingBalance);

      if (!offTheChain(assetType) && isSelf(to) && !eq(quantity, balanceDiff)) {
        throw new Error(`Expected recipient ${assetType} balance to increase by ${quantity} but got ${balanceDiff}`);
      }

      if (isSelf(from) && isSelf(to)) {
        log.debug(`Ending ${assetType} balances | sender ${getBalance(from, assetType)} | recipient ${getBalance(to, assetType)}`);
      } else if (isSelf(from)) {
        log.debug(`Ending ${assetType} balances | sender ${getBalance(from, assetType)} | recipient external`);
      } else if (isSelf(to)) {
        log.debug(`Ending ${assetType} balances | sender external | recipient ${getBalance(to, assetType)}`);
      } else {
        throw new Error(`We shouldn't have actually processed an external-to-external transfer`);
        continue;
      }

    }
    log.debug(`Final state after applying ${event.date} ${event.description}: ${
      JSON.stringify(state, null, 2)
    }`);

    return [state, logs];
  };
};
