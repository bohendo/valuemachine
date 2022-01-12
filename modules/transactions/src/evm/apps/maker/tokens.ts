import { AddressZero } from "@ethersproject/constants";
import { formatUnits } from "@ethersproject/units";
import { Asset, Logger } from "@valuemachine/types";

import { TransferCategories } from "../../../enums";
import { AddressBook, Transaction } from "../../../types";
import { Apps } from "../../enums";
import { EvmMetadata, EvmTransaction } from "../../types";
import { parseEvent } from "../../utils";

import {
  tubAddress,
  pethAddress,
  tokenAddresses,
} from "./addresses";

const appName = Apps.Maker;

const { SwapIn, SwapOut, Borrow, Repay, Noop } = TransferCategories;

////////////////////////////////////////
/// Abis

const tokenAbi = [
  "event Approval(address indexed src, address indexed guy, uint256 wad)",
  "event Burn(address indexed guy, uint256 wad)",
  "event LogNote(bytes4 indexed sig, address indexed guy, bytes32 indexed foo, bytes32 indexed bar, uint256 wad, bytes fax) anonymous",
  "event Mint(address indexed guy, uint256 wad)",
  "event Transfer(address indexed src, address indexed dst, uint256 wad)"
];

////////////////////////////////////////
/// Parser

export const tokenParser = (
  tx: Transaction,
  evmTx: EvmTransaction,
  evmMeta: EvmMetadata,
  addressBook: AddressBook,
  logger: Logger,
): Transaction => {
  const log = logger.child({ name: `${appName}:${evmTx.hash.substring(0, 6)}` });
  const addressZero = `${evmMeta.name}/${AddressZero}`; 
  const { getDecimals, getName, isSelf } = addressBook;

  // Process PETH/SAI/DAI mints/burns
  for (const txLog of evmTx.logs) {
    const address = txLog.address;

    if (tokenAddresses.some(e => e.address === address)) {
      const asset = getName(address) as Asset;
      const event = parseEvent(tokenAbi, txLog, evmMeta);
      if (!event.name) continue;
      const wad = formatUnits(event.args.wad, getDecimals(address));

      if (event.name === "Mint") {
        log.info(`Parsing ${asset} ${event.name} of ${wad}`);
        tx.apps.push(appName);
        const guy = event.args.guy;
        if (address === pethAddress) {
          tx.transfers.push({
            asset,
            category: isSelf(guy) ? SwapIn : Noop,
            from: tubAddress,
            index: txLog.index,
            amount: wad,
            to: guy,
          });
        } else {
          tx.transfers.push({
            asset,
            category: isSelf(guy) ? Borrow : Noop,
            from: addressZero, // we'll set the real value while parsing Vat events
            index: txLog.index,
            amount: wad,
            to: guy,
          });
        }

      } else if (event.name === "Burn") {
        log.info(`Parsing ${asset} ${event.name} of ${wad}`);
        tx.apps.push(appName);
        const guy = event.args.guy;
        if (address === pethAddress) {
          tx.transfers.push({
            asset,
            category: isSelf(guy) ? SwapOut : Noop,
            from: guy,
            index: txLog.index,
            amount: wad,
            to: tubAddress,
          });
        } else {
          tx.transfers.push({
            asset,
            category: isSelf(guy) ? Repay : Noop,
            from: guy,
            index: txLog.index,
            amount: wad,
            to: addressZero, // we'll set the real value while parsing Vat events
          });
        }

      } else if (["Approval", "Transfer"].includes(event.name)) {
        continue; // already handled by generic token parser
      } else {
        log.warn(`Unknown ${event.name} event from ${asset}`);
      }
    }
  }

  return tx;
};
