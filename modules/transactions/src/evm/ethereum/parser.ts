import {
  AddressBook,
  EvmParsers,
  EvmMetadata,
  EvmTransaction,
  Logger,
  Transaction,
} from "@valuemachine/types";

import { ethereumParsers } from "../apps";
import { parseEvmTx } from "../parser";

export const parseEthereumTx = (
  ethTx: EvmTransaction,
  ethMetadata: EvmMetadata,
  addressBook: AddressBook,
  logger: Logger,
  extraParsers = { insert: [], modify: [] } as EvmParsers,
): Transaction =>
  parseEvmTx(
    ethTx,
    ethMetadata,
    addressBook,
    logger,
    ethereumParsers.concat(extraParsers),
  );
