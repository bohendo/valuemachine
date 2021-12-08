import { Logger } from "@valuemachine/types";

import { AddressBook, Transaction } from "../../types";
import { polygonParsers } from "../apps";
import { parseEvmTx } from "../parser";
import { EvmMetadata, EvmParsers, EvmTransaction } from "../types";

export const parsePolygonTx = (
  polygonTx: EvmTransaction,
  polygonMetadata: EvmMetadata,
  addressBook: AddressBook,
  logger: Logger,
  extraParsers = { insert: [], modify: [] } as EvmParsers,
): Transaction =>
  parseEvmTx(
    polygonTx,
    polygonMetadata,
    addressBook,
    logger,
    polygonParsers.concat(extraParsers),
  );
