import { assertState } from "./checkpoints";
import { env } from "./env";
import { getState } from "./state";
import {
  AddressBook,
  Event,
  Log,
  State,
  StateJson,
  LogTypes,
} from "./types";
import { eq, gt, Logger, mul, round, sub } from "./utils";

export const getValueMachine = (addressBook: AddressBook): any => {
  const log = new Logger("ValueMachine", env.logLevel);
  const { pretty, isSelf } = addressBook;

  return (oldState: StateJson | null, event: Event): [State, Log[]] => {
    const state = getState(addressBook, oldState);
    const startingBalances = state.getRelevantBalances(event);
    log.info(`Applying event from ${event.date}: ${event.description}`);
    log.debug(`Applying transfers: ${
      JSON.stringify(event.transfers, null, 2)
    } to sub-state ${
      JSON.stringify(startingBalances, null, 2)
    }`);
    const logs = [] as Log[];

    ////////////////////////////////////////
    // VM Core

    const later = [];
    for (const { assetType, fee, from, index, quantity, to } of event.transfers) {
      log.debug(`transfering ${quantity} ${assetType} from ${pretty(from)} to ${pretty(to)}`);
      let feeChunks;
      let chunks;
      try {
        if (fee) {
          feeChunks = state.getChunks(from, assetType, fee, event);
          log.debug(`Dropping ${feeChunks.length} chunks to cover fees of ${fee} ${assetType}`);
        }
        chunks = state.getChunks(from, assetType, quantity, event);
        chunks.forEach(chunk => state.putChunk(to, chunk));

        // Emit capital gain logs
        if (isSelf(from) && !isSelf(to)) {
          chunks.forEach(chunk => {
            const cost = mul(chunk.purchasePrice, chunk.quantity);
            const proceeds = mul(event.prices[chunk.assetType], chunk.quantity);
            logs.push({
              cost,
              date: event.date,
              dateRecieved: chunk.dateRecieved,
              description: `${round(chunk.quantity, 4)} ${chunk.assetType}`,
              gainOrLoss: sub(proceeds, cost),
              proceeds,
              type: LogTypes.CapitalGains,
            });
          });
        }

      } catch (e) {
        log.warn(e.message);
        if (feeChunks) {
          feeChunks.forEach(chunk => state.putChunk(from, chunk));
        }
        later.push({ assetType, fee, from, index, quantity, to });
        continue;
      }
    }

    for (const { assetType, fee, from, quantity, to } of later) {
      log.debug(`transfering ${quantity} ${assetType} from ${pretty(from)} to ${pretty(to)} (attempt 2)`);
      if (fee) {
        const feeChunks = state.getChunks(from, assetType, fee, event);
        log.debug(`Dropping ${feeChunks.length} chunks to cover fees of ${fee} ${assetType}`);
      }
      const chunks = state.getChunks(from, assetType, quantity, event);
      chunks.forEach(chunk => state.putChunk(to, chunk));
    }

    ////////////////////////////////////////

    const endingBalances = state.getRelevantBalances(event);

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
    state.touch(event.date);

    return [state, logs];
  };
};
