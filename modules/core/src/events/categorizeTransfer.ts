import {
  AddressBook,
  AddressCategories,
  ILogger,
  TransactionLog,
  Transfer,
  TransferCategories,
} from "@finances/types";
import { AddressZero } from "ethers/constants";
import { formatEther } from "ethers/utils";

import { exchangeEvents, daiJoinInterface, defiEvents, vatInterface } from "../abi";
import { eq, ContextLogger } from "../utils";

export const categorizeTransfer = (
  inputTransfer: Partial<Transfer>,
  txLogs: TransactionLog[],
  addressBook: AddressBook,
  logger?: ILogger,
): Transfer => {
  const transfer = JSON.parse(JSON.stringify(inputTransfer));
  const { isCategory, isSelf, getName } = addressBook;
  const log = new ContextLogger("CategorizeTransfer", logger);

  log.debug(`Categorizing transfer of ${transfer.quantity} from ${getName(transfer.from)} to ${getName(transfer.to)}`);

  // Doesn't matter if self-to-self or external-to-external
  if (isSelf(transfer.from) && isSelf(transfer.to)) {
    return transfer;
  } else if (!isSelf(transfer.from) && !isSelf(transfer.to)) {
    return transfer;

  // eg SwapOut to Uniswap
  } else if (isCategory(AddressCategories.Exchange)(transfer.to)) {
    transfer.category = TransferCategories.SwapOut;
    return transfer;

  // eg SwapIn from Uniswap
  } else if (isCategory(AddressCategories.Exchange)(transfer.from)) {
    transfer.category = TransferCategories.SwapIn;
    return transfer;

  // eg deposit into compound v1
  } else if (isCategory(AddressCategories.Defi)(transfer.to)) {
    transfer.category = TransferCategories.Deposit;
    return transfer;

  // eg withdraw from compound v1
  } else if (isCategory(AddressCategories.Defi)(transfer.from)) {
    transfer.category = TransferCategories.Withdraw;
    return transfer;

  // deposit into compound v2
  } else if (isCategory(AddressCategories.CToken)(transfer.to)) {
    transfer.category = TransferCategories.Deposit;
    return transfer;

  // withdraw from compound v2
  } else if (isCategory(AddressCategories.CToken)(transfer.from)) {
    transfer.category = TransferCategories.Withdraw;
    return transfer;

  // gifts
  } else if (
    isCategory(AddressCategories.Family)(transfer.to) ||
    isCategory(AddressCategories.Family)(transfer.from)
  ) {
    transfer.category = TransferCategories.Gift;
    return transfer;

  } else if (
    transfer.assetType === "ETH" &&
    addressBook.getName(transfer.from) === "WETH"
  ) {
    transfer.category = TransferCategories.SwapIn;
  } else if (
    transfer.assetType === "ETH"
    && addressBook.getName(transfer.to) === "WETH"
  ) {
    transfer.category = TransferCategories.SwapOut;
  }

  for (const txLog of txLogs) {

    if (isCategory(AddressCategories.Defi)(txLog.address)) {

      // update dai addresses address zero params for compound v2
      if (isCategory(AddressCategories.CToken)(txLog.address)) {
        const event = defiEvents.find(e => e.topic === txLog.topics[0]);
        if (!event) { continue; }
        const data = event.decode(txLog.data, txLog.topics);
        // Withdraw
        if (event.name === "Redeem" && eq(formatEther(data.redeemAmount), transfer.quantity)) {
          transfer.category = TransferCategories.Withdraw;
          if (transfer.from === AddressZero) {
            transfer.from = txLog.address;
          }
        // Deposit
        } else if (event.name === "Mint" && eq(formatEther(data.mintAmount), transfer.quantity)) {
          transfer.category = TransferCategories.Deposit;
        }

      // makerdao
      } else if (
        getName(txLog.address) === "mcd-vat" &&
        txLog.topics[0].slice(0,10) === vatInterface.functions.move.sighash
      ) {
        const src = "0x"+ txLog.topics[1].slice(26);
        const dst = "0x"+ txLog.topics[2].slice(26);

        // Amounts are not always exact so not sure if we can make useful comparisons yet
        // const rad = formatUnits(txLog.topics[2], 45);

        if (transfer.from === AddressZero && getName(src) === "mcd-pot" /* user-specific */) {
          transfer.category = TransferCategories.Withdraw;
          transfer.from = src;
          break;

        } else if (transfer.from === AddressZero && getName(src) === "cdp" /* user-specific */) {
          transfer.category = TransferCategories.Borrow;
          transfer.from = src;
          break;

        } else if (transfer.to === AddressZero && getName(dst) === "mcd-pot") {
          transfer.category = TransferCategories.Deposit;
          transfer.to = dst;
          break;

        } else if (transfer.to === AddressZero && getName(dst) === "cdp") {
          transfer.category = TransferCategories.Repay;
          transfer.to = dst;
          break;

        }

      // eg compound v1
      } else {
        const event = defiEvents.find(e => e.topic === txLog.topics[0]);
        if (!event) { continue; }
        const data = event.decode(txLog.data, txLog.topics);
        if (
          eq(formatEther(data.amount), transfer.quantity) &&
          getName(data.asset) === transfer.assetType
        ) {
          if (event.name === "RepayBorrow") {
            transfer.category = TransferCategories.Repay;
          } else if (event.name === "Borrow") {
            transfer.category = TransferCategories.Borrow;
          } else if (event.name === "SupplyReceived") {
            transfer.category = TransferCategories.Deposit;
          } else if (event.name === "SupplyWithdrawn") {
            transfer.category = TransferCategories.Withdraw;
          } else if (event.name === "BorrowTaken") {
            transfer.category = TransferCategories.Borrow;
          } else if (event.name === "BorrowRepaid") {
            transfer.category = TransferCategories.Repay;
          }
        }
      }

    // eg Oasis Dex
    } else if (isCategory(AddressCategories.Exchange)(txLog.address)) {
      const event = exchangeEvents.find(e => e.topic === txLog.topics[0]);
      if (event && event.name === "LogTake") {
        const data = event.decode(txLog.data, txLog.topics);
        if (eq(formatEther(data.take_amt), transfer.quantity)) {
          transfer.category = TransferCategories.SwapIn;
          break;
        } else if (eq(formatEther(data.give_amt), transfer.quantity)) {
          transfer.category = TransferCategories.SwapOut;
          break;
        }
      }

    // eg SCD -> MCD Migration
    } else if (
      getName(txLog.address) === "mcd-dai-join" &&
      txLog.topics[0].slice(0,10) === daiJoinInterface.functions.exit.sighash
    ) {
      const src = "0x" + txLog.topics[1].slice(26).toLowerCase();
      const dst = "0x" + txLog.topics[2].slice(26).toLowerCase();
      const amt = formatEther(txLog.topics[3]);
      if (
        getName(src) === "scd-mcd-migration" &&
        isSelf(dst) &&
        eq(amt, transfer.quantity) &&
        transfer.from === AddressZero
      ) {
        transfer.category = TransferCategories.SwapIn;
        transfer.from = src;
        break;
      }
    }

  }
  return transfer;
};
