import { env } from "./env";
import {
  AddressBook,
  AssetChunk,
  Event,
  Log,
  State,
} from "./types";
import { add, eq, gt, Logger, lt, mul, round, sub } from "./utils";

export const getValueMachine = (addressBook: AddressBook) =>
  (event: Event, oldState?: State): [State, Log] => {
    const log = new Logger("ValueMachine", env.logLevel);
    const state = JSON.parse(JSON.stringify(oldState || {})) as State;
    const trades = [];
    const total = { cost: {}, proceeds: {}, profit: {} };
    const logs = [];
    log.debug(`Applying event ${JSON.stringify(event)} to state ${JSON.stringify(state)}`);

    // TODO: what if input.capitalGainsMethod is LIFO or HIFO?
    const getNext = (assetType: string): AssetChunk =>
      state.self[assetType] ? state.self[assetType].pop() : undefined;
    const putBack = (assetType: string, asset: AssetChunk): number =>
      state.self[assetType].unshift(asset);

    const date = event.date;

    if (event.description.includes(" ETH")) { log.setLevel(5); } else { log.setLevel(3); }

    log.info(`Processing event on ${date.split("T")[0]}: ${event.description || JSON.stringify(event)}`);
    // log.debug(`Processing event: ${JSON.stringify(event)}`);

    for (const { assetType, from, quantity } of event.transfers) {
      if (assetType.toUpperCase().startsWith("C")) {
        continue;
      }
      const app = addressBook.getName(from);
      if (!state[app]) {
        log.debug(`Creating new asset app for ${app}`);
        state[app] = {};
      }
      if (!state[app][assetType]) {
        log.debug(`Creating new asset category for ${app}: ${assetType}`);
        state[app][assetType] = [];
      }

      if (app !== "self") {

        // eslint-disable-next-line no-constant-condition
        let toWithdraw = quantity;
        while (gt(toWithdraw, "0")) {
          const chunk = state[app][assetType].pop();
          if (!chunk) {
            // TODO: identify exchanges or calculate interest gained
            if (!state.self[assetType]) {
              state.self[assetType] = [];
            }
            state.self[assetType].push({
              dateRecieved: date,
              purchasePrice: event.prices[assetType],
              quantity: toWithdraw,
            });
            log.warn(`Withdrew ${toWithdraw} more ${assetType} from ${app} than we've deposited`);
            toWithdraw = "0";
          } else if (eq(chunk.quantity, toWithdraw)) {
            state.self[assetType].push(chunk);
            toWithdraw = sub(toWithdraw, chunk.quantity);
            log.debug(`Withdrew chunk of ${chunk.quantity} ${assetType} from ${app} (done)`);
          } else if (gt(chunk.quantity, toWithdraw)) {
            const chunkLeft = sub(chunk.quantity, toWithdraw);
            state.self[assetType].push({
              quantity: sub(chunk.quantity, chunkLeft),
              ...chunk,
            });
            state[app][assetType].unshift({
              quantity: chunkLeft,
              ...chunk,
            });
            toWithdraw = sub(toWithdraw, chunk.quantity);
            log.debug(`Withdrew partial chunk of ${chunk.quantity} ${assetType} from ${app}`);
          } else if (lt(chunk.quantity, toWithdraw)) {
            state.self[assetType].push(chunk);
            toWithdraw = sub(toWithdraw, chunk.quantity);
            log.debug(`Withdrew chunk of ${chunk.quantity} ${assetType} from ${app} (cont)`);
          }
        }

      } else {

        state[app][assetType].push({
          dateRecieved: date,
          purchasePrice: event.prices[assetType],
          quantity: quantity,
        });

      }
    }

    for (const { assetType, quantity, to } of event.transfers) {
      if (assetType.toUpperCase().startsWith("C")) {
        continue;
      }
      const app = addressBook.getName(to);
      if (!state[app]) {
        log.debug(`Creating new asset app for ${app}`);
        state[app] = {};
      }
      if (!state[app][assetType]) {
        log.debug(`Creating new asset category for ${app}: ${assetType}`);
        state[app][assetType] = [];
      }

      // Deposit this asset into defi app
      if (app !== "self") {

        // eslint-disable-next-line no-constant-condition
        let toDeposit = quantity;
        while (gt(toDeposit, "0")) {
          const chunk = getNext(assetType);
          if (!chunk) {
            throw new Error(`Failed to deposit ${assetType} into ${app} bc we don't have enough.`);
          }
          if (eq(chunk.quantity, toDeposit)) {
            state[app][assetType].push(chunk);
            toDeposit = sub(toDeposit, chunk.quantity);
            log.debug(`Deposited chunk of ${chunk.quantity} ${assetType} into ${app} (done)`);
          } else if (gt(chunk.quantity, toDeposit)) {
            const chunkLeft = sub(chunk.quantity, toDeposit);
            state[app][assetType].push({
              quantity: sub(chunk.quantity, chunkLeft),
              ...chunk,
            });
            toDeposit = sub(toDeposit, chunk.quantity);
            state.self[assetType].unshift({
              quantity: chunkLeft,
              ...chunk,
            });
            log.debug(`Deposited partial chunk of ${chunk.quantity} ${assetType} into ${app}`);
          } else if (lt(chunk.quantity, toDeposit)) {
            state[app][assetType].push(chunk);
            toDeposit = sub(toDeposit, chunk.quantity);
            log.debug(`Deposited chunk of ${chunk.quantity} ${assetType} into ${app} (cont)`);
          }
        }

      } else {

        let amt = quantity;
        let cost = "0";
        let profit = "0";
        let proceeds = "0";

        // eslint-disable-next-line no-constant-condition
        while (true) {
          if (eq(amt, "0") || lt(amt, "0")) {
            break;
          }

          const chunk = getNext(assetType);
          if (!chunk) {
            throw new Error(`Selling more ${assetType} than we have`);
            break;
          }

          const price = event.prices[assetType];
          if (!price) {
            throw new Error(`Chunk is missing a price: ${JSON.stringify(chunk, null, 2)}`);
          }

          if (eq(chunk.quantity, amt)) {
            profit = add([profit, mul(amt, sub(price, chunk.purchasePrice))]);
            cost = add([cost, mul(chunk.purchasePrice, amt)]);
            chunk.quantity = sub(chunk.quantity, amt);
            log.debug(`Sold chunk of ${chunk.quantity} ${assetType} for profit of ${profit} (done)`);
            break;
          } else if (gt(chunk.quantity, amt)) {
            profit = add([profit, mul(amt, sub(price, chunk.purchasePrice))]);
            cost = add([cost, mul(chunk.purchasePrice, amt)]);
            chunk.quantity = sub(chunk.quantity, amt);
            putBack(assetType, chunk);
            log.debug(`Sold partial chunk of ${chunk.quantity} ${assetType} for profit of ${profit}`);
            break;
          } else {
            profit = add([profit, mul(chunk.quantity, sub(price, chunk.purchasePrice))]);
            cost = add([cost, mul(chunk.purchasePrice, chunk.quantity)]);
            amt = sub(amt, chunk.quantity);
            log.debug(`Sold chunk of ${chunk.quantity} ${assetType} for profit of ${profit} (cont)`);
          }
        }
        proceeds = mul(event.prices[assetType], quantity);

        trades.push({
          Adjustment: "",
          Code: "",
          Cost: cost,
          DateAcquired: "VARIOUS",
          // DateSold: month/day/year
          DateSold: `${date.substring(5,7)}/${date.substring(8,10)}/${date.substring(2,4)}`,
          Description: `${round(quantity)} ${assetType}`,
          GainOrLoss: profit,
          Proceeds: proceeds,
        });

        total.proceeds[assetType] = add([total.proceeds[assetType], proceeds]);
        total.cost[assetType] = add([total.cost[assetType], cost]);
        total.profit[assetType] = add([total.profit[assetType], profit]);

      }
    }

    return [state, logs];
  };
