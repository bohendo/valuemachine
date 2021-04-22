import { AddressBook, Logger, ChainData, Transaction } from "@finances/types";

import { mergeTransaction } from "../utils";

import { parseEthTx } from "./tx";

export const mergeEthTransactions = (
  transactions: Transaction[],
  addressBook: AddressBook,
  chainData: ChainData,
  logger?: Logger,
): Transaction[] => {

  chainData.getEthTransactions(ethTx =>
    !transactions.some(tx => tx.hash === ethTx.hash),
  ).forEach(ethTx =>
    mergeTransaction(
      transactions,
      parseEthTx(
        ethTx,
        addressBook,
        chainData,
        logger,
      ),
      logger,
    )
  );

  return transactions;
};
