import {
  AddressBook,
  EvmMetadata,
  EvmTransaction,
  Logger,
  Transaction,
  TransferCategories,
} from "@valuemachine/types";
import { insertVenue } from "@valuemachine/utils";

import { Assets, Apps, Methods } from "../../enums";
import { parseEvent } from "../../utils";

import {
  coreAddress,
  saleAuctionAddress,
  sireAuctionAddress,
} from "./addresses";

const appName = Apps.CryptoKitties;

// const { Income, Internal, SwapIn, SwapOut, Borrow, Repay } = TransferCategories;

const cryptokittyAbi = [
  "event Approval(address owner, address approved, uint256 tokenId)",
  "event Birth(address owner, uint256 kittyId, uint256 matronId, uint256 sireId, uint256 genes)",
  "event ContractUpgrade(address newContract)",
  "event Pregnant(address owner, uint256 matronId, uint256 sireId, uint256 cooldownEndBlock)",
  "event Transfer(address from, address to, uint256 tokenId)",
];

const auctionAbi = [
  "event AuctionCreated(uint256 tokenId, uint256 startingPrice, uint256 endingPrice, uint256 duration)",
  "event AuctionSuccessful(uint256 tokenId, uint256 totalPrice, address winner)",
  "event AuctionCancelled(uint256 tokenId)",
  "event Pause()",
  "event Unpause()"
];

const coreParser = (
  tx: Transaction,
  evmTx: EvmTransaction,
  evmMeta: EvmMetadata,
  addressBook: AddressBook,
  logger: Logger,
): Transaction => {
  const log = logger.child({ module: `${appName}:${evmTx.hash.substring(0, 6)}` });

  for (const txLog of evmTx.logs) {
    const address = txLog.address;

    if (coreAddress === address) {
      const event = parseEvent(cryptokittyAbi, txLog, evmMeta);
      if (!event?.name) continue;
      tx.apps.push(appName);

      if (event.name === "Pregnant") {
        if (addressBook.isSelf(event.args.owner)) {
          const account = insertVenue(event.args.owner, appName);
          const asset = `${appName}_${event.args.matronId}`;
          log.info(`${asset} owned by ${account} got pregnant`);
          tx.method = Methods.Breed;
          const deposit = tx.transfers.find(transfer => 
            transfer.asset === Assets.ETH &&
            transfer.to === address && transfer.from === event.args.owner
          );
          if (deposit) {
            deposit.category = TransferCategories.Internal;
            deposit.to = account;
          } else {
            log.warn(`Couldn't find an ${Assets.ETH} transfer to ${address}`);
          }
        }

      } else if (event.name === "Birth") {
        if (addressBook.isSelf(event.args.owner)) {
          tx.method = Methods.Birth;
          const account = insertVenue(event.args.owner, appName);
          const asset = `${appName}_${event.args.kittyId}`;
          log.info(`${asset} was born to ${account}`);
          const swapIn = tx.transfers.find(transfer => 
            transfer.to === event.args.owner && transfer.from === address
            && transfer.asset === asset
          );
          if (swapIn) {
            log.info(`Found swap in of ${
              swapIn.amount ? swapIn.amount + " " : ""
            }${swapIn.asset}`);
            swapIn.category = TransferCategories.SwapIn;
            swapIn.to = account;
            swapIn.from = address;
            tx.transfers.push({
              ...swapIn,
              category: TransferCategories.Internal,
              from: account,
              to: event.args.owner,
            });
          }
          const swapOut = tx.transfers.find(transfer => 
            transfer.from === address && transfer.asset === Assets.ETH
          );
          if (swapOut) {
            log.info(`Found swap out of ${
              swapOut.amount ? swapOut.amount + " " : ""
            }${swapOut.asset}`);
            swapOut.category = TransferCategories.SwapOut;
            swapOut.from = account;
          }
        }
      }

    } else if (saleAuctionAddress === address || sireAuctionAddress === address) {
      const event = parseEvent(auctionAbi, txLog, evmMeta);
      if (!event?.name) continue;
      tx.apps.push(appName);
      const name = addressBook.getName(address);
      log.info(`Found ${name} ${event.name}`);
      // const asset = `${appName}_${event.args.tokenId}`;
      if (event.name === "AuctionCreated") {
        tx.method = Methods.Auction;
        const deposit = tx.transfers.find(transfer =>
          addressBook.isSelf(transfer.from) && transfer.to === address
        ); 
        if (deposit) {
          deposit.category = TransferCategories.Internal;
          deposit.to = insertVenue(deposit.from, name);
        }

      } else if (event.name === "AuctionCancelled") {
        tx.method = Methods.Cancel;

      } else if (event.name === "AuctionSuccessful") {
        const weWon = addressBook.isSelf(event.args.winner);
        // If we are the buyer
        if (weWon) {
          const account = event.args.winner;
          const swapOut = tx.transfers.find(transfer =>
            transfer.from === event.args.winner && transfer.to === address
          );
          if (swapOut) {
            swapOut.category = TransferCategories.SwapOut;
            swapOut.index = "index" in swapOut ? swapOut.index : txLog.index;
          }
          const swapIn = tx.transfers.find(transfer =>
            transfer.to === event.args.winner && transfer.from === address
          );
          if (swapIn) {
            swapIn.to = account;
            swapIn.category = TransferCategories.SwapOut;
            swapIn.index = "index" in swapIn ? swapIn.index : txLog.index;
          }
          const refund = tx.transfers.find(transfer =>
            transfer.to === event.args.winner && transfer.from === address
          );
          if (refund) {
            refund.category = TransferCategories.Refund;
            refund.index = "index" in refund ? refund.index : txLog.index;
          }

        // If we are the seller
        } else {

          const swapIn = tx.transfers.find(transfer =>
            addressBook.isSelf(transfer.to) && transfer.from === address
          );
          if (swapIn) {
            const swapInAddress = swapIn.to;
            const account = insertVenue(swapIn.to, appName);
            swapIn.to = account;
            swapIn.category = TransferCategories.SwapIn;
            swapIn.index = "index" in swapIn ? swapIn.index : txLog.index;
            const swapOut = tx.transfers.find(transfer =>
              transfer.from === address && transfer.asset.startsWith(appName)
            );
            if (swapOut) {
              swapOut.category = TransferCategories.SwapOut;
              swapOut.from = account;
              swapOut.index = "index" in swapOut ? swapOut.index : txLog.index;
              tx.transfers.push({
                asset: swapOut.asset,
                category: TransferCategories.Internal,
                from: account,
                index: txLog.index + 2,
                to: swapInAddress,
              });
              tx.method = Methods.Sale;
            }

          }

        }

      }
    }
  }

  return tx;
};

export const parsers = { insert: [], modify: [coreParser] };
