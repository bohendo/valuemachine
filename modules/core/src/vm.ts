import {
  AddressBook,
  AssetTypes,
  Event,
  Logger,
  Prices,
  StateJson,
  Transaction,
} from "@finances/types";
import { getLogger } from "@finances/utils";

import { emitTransactionEvents, emitTransferEvents } from "./events";
import { getState } from "./state";

export const getValueMachine = ({
  addressBook,
  prices,
  logger,
  unitOfAccount,
}: {
  addressBook: AddressBook,
  prices: Prices,
  logger?: Logger
  unitOfAccount: AssetTypes,
}): any => {
  const uoa = unitOfAccount || AssetTypes.ETH;
  const log = (logger || getLogger()).child({ module: "ValueMachine" });
  const { getName } = addressBook;

  return (oldState: StateJson, transaction: Transaction): [StateJson, Event[]] => {
    const state = getState({ stateJson: oldState, addressBook, prices, logger });
    log.debug(`Applying transaction ${transaction.index} from ${
      transaction.date
    }: ${transaction.description}`);
    log.debug(`Applying transfers: ${
      JSON.stringify(transaction.transfers, null, 2)
    } to sub-state ${
      JSON.stringify(state.getRelevantBalances(transaction), null, 2)
    }`);
    const logs = [] as Event[];

    ////////////////////////////////////////
    // VM Core

    const later = [];
    for (const transfer of transaction.transfers) {
      const { assetType, fee, from, quantity, to } = transfer;
      if (
        !Object.values(AssetTypes).includes(assetType) &&
        !addressBook.isToken(assetType)
      ) {
        log.debug(`Skipping transfer of unsupported token: ${assetType}`);
        continue;
      }
      log.debug(`transfering ${quantity} ${assetType} from ${getName(from)} to ${getName(to)}`);
      let feeChunks;
      let chunks;
      try {
        if (fee) {
          feeChunks = state.getChunks(from, assetType, fee, transaction, unitOfAccount);
          log.debug(`Dropping ${feeChunks.length} chunks to cover fees of ${fee} ${assetType}`);
        }
        chunks = state.getChunks(from, assetType, quantity, transaction, unitOfAccount);
        chunks.forEach(chunk => state.putChunk(to, chunk));
        logs.push(...emitTransferEvents(
          addressBook,
          chunks,
          transaction,
          transfer,
          prices,
          uoa,
          log,
        ));
      } catch (e) {
        log.debug(`Error while processing tx ${e.message}: ${JSON.stringify(transaction)}`);
        if (e.message.includes("attempted to spend")) {
          if (feeChunks) {
            feeChunks.forEach(chunk => state.putChunk(from, chunk));
          }
          later.push(transfer);
        } else {
          throw e;
        }
      }
    }

    // TODO: instead of reordering transfers so balances never dip below zero,
    // let them go negative only while a tx is being exectued
    // after all transfers have been processed, only then assert that crypto balances are >=0
    for (const transfer of later) {
      const { assetType, fee, from, quantity, to } = transfer;
      log.debug(`transfering ${quantity} ${assetType} from ${getName(from)} to ${
        getName(to)
      } (attempt 2)`);
      if (fee) {
        const feeChunks = state.getChunks(from, assetType, fee, transaction, unitOfAccount);
        log.debug(`Dropping ${feeChunks.length} chunks to cover fees of ${fee} ${assetType}`);
      }
      const chunks = state.getChunks(from, assetType, quantity, transaction, unitOfAccount);
      chunks.forEach(chunk => state.putChunk(to, chunk));
      logs.push(...emitTransferEvents(addressBook, chunks, transaction, transfer, prices));
    }

    ////////////////////////////////////////

    logs.push(...emitTransactionEvents(addressBook, transaction, state, log));

    state.touch(transaction.date);

    return [state.toJson(), logs];
  };
};
