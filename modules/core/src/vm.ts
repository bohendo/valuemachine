import {
  AddressBook,
  Event,
  Logger,
  StateJson,
  Transaction,
} from "@finances/types";
import { getLogger } from "@finances/utils";

import { getStateFns } from "./state";

export const getValueMachine = ({
  addressBook,
  logger,
}: {
  addressBook: AddressBook,
  logger?: Logger
}): any => {
  const log = (logger || getLogger()).child({ module: "ValueMachine" });

  return (oldState: StateJson, transaction: Transaction): [StateJson, Event[]] => {
    const date = transaction.date;
    const events = [] as Event[];
    const state = getStateFns({ stateJson: oldState, addressBook, logger });
    log.debug(`NOT Processing transaction ${transaction.index} from ${date}: ${
      transaction.description
    }`);
    return [state.getJson(), events];
  };

};
