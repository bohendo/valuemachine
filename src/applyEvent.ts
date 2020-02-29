import { Event, Logs, State } from "./types";

export const applyEvent = (state: State, event: Event): [State, Logs] => {
  return event ? [state, []] : [{} as State, []];
};
