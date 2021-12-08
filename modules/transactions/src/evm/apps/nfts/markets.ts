import { Logger } from "@valuemachine/types";

import { TransferCategories } from "../../../enums";
import { AddressBook, Transaction } from "../../../types";
import { Apps } from "../../enums";
import { EvmMetadata, EvmTransaction } from "../../types";
import { parseEvent } from "../../utils";

import { marketAddresses } from "./addresses";

const appName = Apps.NFT;

const openseaAbi = [
  "event OrderApprovedPartOne(bytes32 indexed hash, address exchange, address indexed maker, address taker, uint256 makerRelayerFee, uint256 takerRelayerFee, uint256 makerProtocolFee, uint256 takerProtocolFee, address indexed feeRecipient, uint8 feeMethod, uint8 side, uint8 saleKind, address target)",
  "event OrderApprovedPartTwo(bytes32 indexed hash, uint8 howToCall, bytes calldata, bytes replacementPattern, address staticTarget, bytes staticExtradata, address paymentToken, uint256 basePrice, uint256 extra, uint256 listingTime, uint256 expirationTime, uint256 salt, bool orderbookInclusionDesired)",
  "event OrderCancelled(bytes32 indexed hash)",

  "event OrdersMatched(bytes32 buyHash, bytes32 sellHash, address indexed maker, address indexed taker, uint256 price, bytes32 indexed metadata)",

  "event OwnershipRenounced(address indexed previousOwner)",
  "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)"
];

export const marketParser = (
  tx: Transaction,
  evmTx: EvmTransaction,
  evmMeta: EvmMetadata,
  addressBook: AddressBook,
  logger: Logger,
): Transaction => {
  const log = logger.child({ module: `${appName}:${evmTx.hash.substring(0, 6)}` });

  for (const txLog of evmTx.logs) {
    const address = txLog.address;
    if (marketAddresses.some(e => e.address === address)) {
      const event = parseEvent(openseaAbi, txLog, evmMeta);
      if (!event.name) continue;
      log.debug(`Parsing ${appName} ${event.name}`);
      if (event.name === "OrdersMatched") {
        tx.apps.push(appName);
        log.info(`maker=${event.args.maker}`);
        log.info(`taker=${event.args.taker}`);
        let swapsIn = 0;
        let swapsOut = 0;
        tx.transfers.filter(transfer =>
          addressBook.isSelf(transfer.to) && (
            transfer.from === event.args.maker || transfer.from === address
          )
        ).forEach(swap => {
          swap.category = TransferCategories.SwapIn;
          swap.index = "index" in swap ? swap.index : txLog.index;
          swapsIn += 1;
        });
        tx.transfers.filter(transfer =>
          addressBook.isSelf(transfer.from) && (
            transfer.to === event.args.taker || transfer.to === address
          )
        ).forEach(swap => {
          swap.category = TransferCategories.SwapOut;
          swap.index = "index" in swap ? swap.index : txLog.index;
          swapsOut += 1;
        });
        if (swapsIn && swapsOut) {
          tx.method = `Trade`;
        } else if (swapsIn || swapsOut) {
          log.warn(`Missing swaps swapsIn=${swapsIn} swapsOut=${swapsOut}`);
        } 

      }

    }
  }

  return tx;
};
