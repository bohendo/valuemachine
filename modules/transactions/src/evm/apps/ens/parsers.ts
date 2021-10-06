import { Interface } from "@ethersproject/abi";
import {
  AddressBook,
  EvmMetadata,
  EvmTransaction,
  Logger,
  Transaction,
  TransferCategories,
} from "@valuemachine/types";
import { eq, insertVenue } from "@valuemachine/utils";

import { Apps, Assets, Methods } from "../../enums";
import { parseEvent } from "../../utils";

import {
  addresses,
  nftAddresses,
  registrarV1Address,
  registrarV2Address,
  registrarV3Address,
} from "./addresses";

const appName = Apps.ENS;

const deedIface = new Interface(["event DeedClosed()"]);
const deedClosedTopic = deedIface.getEventTopic(Object.values(deedIface.events)[0]);

const nftAbi = [
  "event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId)",
  "event ApprovalForAll(address indexed owner, address indexed operator, bool approved)",
  "event ControllerAdded(address indexed controller)",
  "event ControllerRemoved(address indexed controller)",
  "event NameMigrated(uint256 indexed id, address indexed owner, uint256 expires)",
  "event NameRegistered(uint256 indexed id, address indexed owner, uint256 expires)",
  "event NameRenewed(uint256 indexed id, uint256 expires)",
  "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
];

const registrarV1Abi = [
  "event AuctionStarted(bytes32 indexed hash, uint256 registrationDate)",
  "event BidRevealed(bytes32 indexed hash, address indexed owner, uint256 value, uint8 status)",
  "event HashInvalidated(bytes32 indexed hash, string indexed name, uint256 value, uint256 registrationDate)",
  "event HashRegistered(bytes32 indexed hash, address indexed owner, uint256 value, uint256 registrationDate)",
  "event HashReleased(bytes32 indexed hash, uint256 value)",
  "event NewBid(bytes32 indexed hash, address indexed bidder, uint256 deposit)",
];

const registrarAbi = [
  "event NameRegistered(string name, bytes32 indexed label, address indexed owner, uint256 cost, uint256 expires)",
  "event NameRenewed(string name, bytes32 indexed label, uint256 cost, uint256 expires)",
  "event NewPriceOracle(address indexed oracle)",
  "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)",
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
    if (addresses.some(e => e.address === address)) {
      tx.apps.push(appName);

      // We've interacted with ENS, check other topics for a deed closure
      const deedClosedLog = evmTx.logs.find(l => l.topics[0] === deedClosedTopic);
      if (deedClosedLog) {
        // All funds send from the deed should be condiered withdrawals
        tx.transfers.filter(transfer =>
          transfer.from === deedClosedLog.address && !eq(transfer.amount, "0")
        ).forEach(withdraw => {
          withdraw.category = TransferCategories.Internal;
          withdraw.from = insertVenue(withdraw.to, appName);
          withdraw.index = "index" in withdraw ? withdraw.index : deedClosedLog.index;
        });
      }

      if (nftAddresses.some(e => e.address === address)) {
        const event = parseEvent(nftAbi, txLog, evmMeta);
        if (!event.name) continue;
        log.info(`Found ${appName} event ${event.name}`);
        if (event.name === "NameMigrated") {
          tx.method = Methods.Migration;
        } else if (event.name === "NameRegistered") {
          tx.method = tx.method === Methods.Unknown ? Methods.Registration : tx.method;
        } else if (event.name === "NameRenewed") {
          tx.method = Methods.Renewal;
        }

      } else if (address === registrarV2Address || address === registrarV3Address) {
        const event = parseEvent(registrarAbi, txLog, evmMeta);
        if (!event.name) continue;
        log.info(`Found ${appName} event ${event.name}`);
        if (event.name === "NameRegistered") {
          if (addressBook.isSelf(event.args.owner)) {
            tx.method = tx.method === Methods.Unknown ? Methods.Registration : tx.method;
            tx.transfers.filter(transfer =>
              transfer.asset === Assets.ETH
              && transfer.from === event.args.owner
              && transfer.to === address
            ).forEach(swapOut => {
              swapOut.category = TransferCategories.SwapOut;
              swapOut.index = "index" in swapOut ? swapOut.index : txLog.index;
              tx.transfers.filter(transfer =>
                transfer.asset === Assets.ETH
                && transfer.from === address
                && transfer.to === event.args.owner
              ).forEach(refund => {
                refund.category = TransferCategories.Refund;
                swapOut.index = "index" in swapOut ? swapOut.index : txLog.index + 1;
              });
            });
            tx.transfers.filter(transfer =>
              transfer.asset.startsWith(appName)
              && transfer.to === event.args.owner
            ).forEach(swapIn => {
              swapIn.category = TransferCategories.SwapIn;
              swapIn.index = "index" in swapIn ? swapIn.index : txLog.index;
            });
          }
        } else if (event.name === "NameRenewed") {
          tx.method = Methods.Renewal;
        }

      } else if (address === registrarV1Address) {
        const event = parseEvent(registrarV1Abi, txLog, evmMeta);
        if (!event.name) continue;
        log.info(`Found ${appName} event ${event.name}`);

        if (event.name === "AuctionStarted") {
          tx.method = Methods.Auction;
        } else if (event.name === "NewBid") {
          if (addressBook.isSelf(event.args.bidder)) {
            tx.method = Methods.Bid;
            const deposit = tx.transfers.find(transfer =>
              transfer.asset === Assets.ETH
              && transfer.to === address
              && transfer.from === event.args.bidder
            );
            if (deposit) {
              deposit.category = TransferCategories.Internal;
              deposit.index = "index" in deposit ? deposit.index : txLog.index;
              deposit.to = insertVenue(deposit.from, appName);
            }
          }
        } else if (event.name === "BidRevealed") {
          if (evmTx.to === address && addressBook.isSelf(event.args.owner)) {
            tx.method = Methods.Bid;
            const withdraw = tx.transfers.find(transfer =>
              transfer.asset === Assets.ETH
              && transfer.to === event.args.owner
            );
            if (withdraw) {
              withdraw.category = TransferCategories.Internal;
              withdraw.index = "index" in withdraw ? withdraw.index : txLog.index;
              withdraw.from = insertVenue(withdraw.to, appName);
            }
          }

          tx.method = Methods.Reveal;
        } else if (event.name === "HashRegistered") {
          tx.method = Methods.Registration;
        } else if (event.name === "HashReleased") {
          tx.method = Methods.Release;
        } else if (event.name === "HashInvalidated") {
          tx.method = Methods.Invalidation;
        }

      }

    }
  }

  return tx;
};

export const parsers = { insert: [], modify: [coreParser] };
