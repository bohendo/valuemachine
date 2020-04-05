import { assertState } from "./checkpoints";
import { env } from "./env";
import { emitLogs } from "./logs";
import { getState } from "./state";
import {
  AddressBook,
  Event,
  Log,
  State,
  StateJson,
} from "./types";
import { eq, gt, Logger, sub } from "./utils";

export const getValueMachine = (addressBook: AddressBook): any => {
  const log = new Logger("ValueMachine", env.logLevel);
  const { pretty } = addressBook;

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
    for (const transfer of event.transfers) {
      const { assetType, fee, from, quantity, to } = transfer;
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
        logs.push(...emitLogs(addressBook, chunks, event, transfer));
      } catch (e) {
        log.warn(e.message);
        if (feeChunks) {
          feeChunks.forEach(chunk => state.putChunk(from, chunk));
        }
        later.push(transfer);
        continue;
      }
    }

    for (const transfer of later) {
      const { assetType, fee, from, quantity, to } = transfer;
      log.debug(`transfering ${quantity} ${assetType} from ${pretty(from)} to ${pretty(to)} (attempt 2)`);
      if (fee) {
        const feeChunks = state.getChunks(from, assetType, fee, event);
        log.debug(`Dropping ${feeChunks.length} chunks to cover fees of ${fee} ${assetType}`);
      }
      const chunks = state.getChunks(from, assetType, quantity, event);
      chunks.forEach(chunk => state.putChunk(to, chunk));
      logs.push(...emitLogs(addressBook, chunks, event, transfer));
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
