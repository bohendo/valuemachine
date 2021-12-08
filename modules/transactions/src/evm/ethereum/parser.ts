import { Logger } from "@valuemachine/types";

import { AddressBook, Transaction } from "../../types";
import { ethereumParsers } from "../apps";
import { parseEvmTx } from "../parser";
import { EvmMetadata, EvmParsers, EvmTransaction } from "../types";

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
