import {
  AddressBook,
  EvmMetadata,
  EvmTransaction,
  Logger,
  Transaction,
  TransferCategories,
} from "@valuemachine/types";
import { gt, insertVenue, sub } from "@valuemachine/utils";

import { Assets, Apps, Methods } from "../../enums";
import { parseEvent } from "../../utils";

import {
  coreAddress,
  saleAuctionAddress,
  sireAuctionAddress,
} from "./addresses";

const appName = Apps.CryptoKitties;
const { ETH } = Assets;

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
          tx.transfers.filter(transfer => 
            transfer.asset === ETH &&
            transfer.to === address && transfer.from === event.args.owner
          ).forEach(deposit => {
            deposit.category = TransferCategories.Internal;
            deposit.to = account;
            // If result of auction, separate out expense & only keep the birthing fee deposited
            const birthingFee = tx.transfers.find(transfer =>
              transfer.asset === ETH &&
              transfer.from === coreAddress && transfer.to === sireAuctionAddress
            )?.amount;
            if (gt(birthingFee, "0")) {
              tx.transfers.push({
                asset: ETH,
                amount: sub(deposit.amount, birthingFee),
                category: TransferCategories.Expense,
                from: event.args.owner,
                index: txLog.index,
                to: sireAuctionAddress,
              });
              deposit.amount = birthingFee;
            }

          });
        }
        // If this pregnancy is the result of a siring auction, handle payment
        const directIncome = tx.transfers.find(transfer =>
          transfer.asset === ETH &&
          addressBook.isSelf(transfer.to) && !transfer.to.includes(appName)
        );
        if (directIncome) {
          tx.method = Methods.Sale;
          const account = insertVenue(directIncome.to, appName);
          const asset = `${appName}_${event.args.sireId}`;
          log.info(`${account} got paid ${directIncome.amount} ETH for siring ${asset}`);
          directIncome.from = address;
          const withdraw = tx.transfers.find(transfer =>
            transfer.asset === asset && transfer.to === directIncome.to
          );
          if (withdraw) {
            withdraw.category = TransferCategories.Internal;
            withdraw.from = account;
          } else {
            log.warn(`Found no ${asset} withdraw associated w sale for ${directIncome.amount} ETH`);
          }
        }

      } else if (event.name === "Birth") {
        // If we are the matron owner
        if (addressBook.isSelf(event.args.owner)) {
          tx.method = Methods.GetBirth;
          const account = insertVenue(event.args.owner, appName);
          const asset = `${appName}_${event.args.kittyId}`;
          log.info(`${asset} was born to ${account}`);
          // Swap in & move crypto kitty to owner address
          const swapIn = tx.transfers.find(transfer => 
            transfer.asset === asset &&
            transfer.to === event.args.owner && transfer.from === address
          );
          if (swapIn) {
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
          // Swap out the fee
          const swapOut = tx.transfers.find(transfer => 
            transfer.asset === ETH &&
            transfer.from === address
          );
          if (swapOut) {
            swapOut.category = TransferCategories.SwapOut;
            swapOut.from = account;
          }
        }
        // directIncome.to is probably an EOA therefore there can only be one income
        const directIncome = tx.transfers.find(transfer =>
          transfer.asset === ETH && addressBook.isSelf(transfer.to)
        );
        if (directIncome) {
          tx.method = Methods.GiveBirth;
          const account = insertVenue(directIncome.to, appName);
          const proxyIncome = tx.transfers.filter(transfer =>
            transfer.asset === ETH &&
            transfer.to === directIncome.from && transfer.from === address
          );
          if (proxyIncome.length) {
            log.info(`${account} gave birth to ${proxyIncome.length} kitties via proxy`);
            proxyIncome.forEach(income => {
              income.category = TransferCategories.Income;
              income.to = account;
            });
            directIncome.category = TransferCategories.Internal;
            directIncome.from = account;
          } else {
            log.info(`${account} gave birth to a kitty`);
            directIncome.category = TransferCategories.Income;
          }
        } else {
          if (addressBook.isSelf(evmTx.from)) {
            tx.method = Methods.Failure;
          }
        }
      }

    } else if (saleAuctionAddress === address || sireAuctionAddress === address) {
      const event = parseEvent(auctionAbi, txLog, evmMeta);
      if (!event?.name) continue;
      tx.apps.push(appName);
      log.info(`Found ${appName} ${event.name}`);
      const asset = `${appName}_${event.args.tokenId}`;
      if (event.name === "AuctionCreated") {
        tx.method = `${Methods.Auction} ${asset}`;
        const deposit = tx.transfers.find(transfer =>
          transfer.asset === asset &&
          addressBook.isSelf(transfer.from) && transfer.to === address
        ); 
        if (deposit) {
          deposit.category = TransferCategories.Internal;
          deposit.to = insertVenue(deposit.from, appName);
        }

      } else if (event.name === "AuctionCancelled") {
        tx.method = `${Methods.Cancel} ${address === saleAuctionAddress
          ? `${appName} Sale`
          : `${appName} Sire`}`;
        const withdraw = tx.transfers.find(transfer =>
          transfer.asset === asset &&
          addressBook.isSelf(transfer.to) && transfer.from === address
        ); 
        if (withdraw) {
          withdraw.category = TransferCategories.Internal;
          withdraw.from = insertVenue(withdraw.to, appName);
        }

      } else if (event.name === "AuctionSuccessful") {
        if (address === saleAuctionAddress) {
          const winner = event.args.winner;
          // If we are the buyer
          if (addressBook.isSelf(winner)) {
            tx.method = Methods.Purchase;
            // Swaps Out
            tx.transfers.filter(transfer =>
              transfer.asset === ETH &&
              transfer.from === winner && transfer.to === address
            ).forEach(swapOut => {
              swapOut.category = TransferCategories.SwapOut;
              swapOut.index = "index" in swapOut ? swapOut.index : txLog.index;
            });
            // Swaps In
            tx.transfers.filter(transfer =>
              transfer.asset.startsWith(appName) &&
              transfer.to === winner && transfer.from === address
            ).forEach(swapIn => {
              swapIn.to = winner;
              swapIn.category = TransferCategories.SwapIn;
              swapIn.index = "index" in swapIn ? swapIn.index : txLog.index;
            });
            // Refunds
            tx.transfers.filter(transfer =>
              transfer.asset === ETH &&
              transfer.to === winner && transfer.from === address
            ).forEach(refund => {
              refund.category = TransferCategories.Refund;
              refund.index = "index" in refund ? refund.index : txLog.index;
            });

          // If we are the seller
          } else {
            tx.transfers.filter(transfer =>
              addressBook.isSelf(transfer.to) && transfer.from === address
            ).forEach(swapIn => {
              const swapInAddress = swapIn.to;
              const account = insertVenue(swapIn.to, appName);
              swapIn.to = account;
              swapIn.category = TransferCategories.SwapIn;
              swapIn.index = "index" in swapIn ? swapIn.index : txLog.index;
              tx.transfers.filter(transfer =>
                transfer.from === address && transfer.asset.startsWith(appName)
              ).forEach(swapOut => {
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
              });
            });
          }
        }
      }
    }
  }

  return tx;
};

export const parsers = { insert: [], modify: [coreParser] };
