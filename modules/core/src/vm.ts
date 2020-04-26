import { AddressBook, State, Event, ILogger, Log, StateJson } from "@finances/types";

import { emitEventLogs, emitTransferLogs } from "./logs";
import { getState } from "./state";
import { ContextLogger } from "./utils";

export const getValueMachine = (addressBook: AddressBook, logger?: ILogger): any => {
  const log = new ContextLogger("ValueMachine", logger);
  const { getName } = addressBook;

  return (oldState: StateJson | null, event: Event): [State, Log[]] => {
    const state = getState(addressBook, oldState, logger);
    log.info(`Applying event from ${event.date}: ${event.description}`);
    log.debug(`Applying transfers: ${
      JSON.stringify(event.transfers, null, 2)
    } to sub-state ${
      JSON.stringify(state.getRelevantBalances(event), null, 2)
    }`);
    const logs = [] as Log[];

    ////////////////////////////////////////
    // VM Core

    const later = [];
    for (const transfer of event.transfers) {
      const { assetType, fee, from, quantity, to } = transfer;
      log.debug(`transfering ${quantity} ${assetType} from ${getName(from)} to ${getName(to)}`);
      let feeChunks;
      let chunks;
      try {
        if (fee) {
          feeChunks = state.getChunks(from, assetType, fee, event);
          log.debug(`Dropping ${feeChunks.length} chunks to cover fees of ${fee} ${assetType}`);
        }
        chunks = state.getChunks(from, assetType, quantity, event);
        chunks.forEach(chunk => state.putChunk(to, chunk));
        logs.push(...emitTransferLogs(addressBook, chunks, event, transfer));
      } catch (e) {
        log.warn(e.message);
        if (feeChunks) {
          feeChunks.forEach(chunk => state.putChunk(from, chunk));
        }
        later.push(transfer);
      }
    }

    for (const transfer of later) {
      const { assetType, fee, from, quantity, to } = transfer;
      log.debug(`transfering ${quantity} ${assetType} from ${getName(from)} to ${getName(to)} (attempt 2)`);
      if (fee) {
        const feeChunks = state.getChunks(from, assetType, fee, event);
        log.debug(`Dropping ${feeChunks.length} chunks to cover fees of ${fee} ${assetType}`);
      }
      const chunks = state.getChunks(from, assetType, quantity, event);
      chunks.forEach(chunk => state.putChunk(to, chunk));
      logs.push(...emitTransferLogs(addressBook, chunks, event, transfer));
    }

    ////////////////////////////////////////

    logs.push(...emitEventLogs(addressBook, event, state));

    state.touch(event.date);

    return [state, logs];
  };
};
