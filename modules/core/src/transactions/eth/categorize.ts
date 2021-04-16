import {
  Address,
  AddressBook,
  AddressCategories,
  Logger,
  EthTransactionLog,
  Transfer,
  TransferCategories,
} from "@finances/types";
import { math } from "@finances/utils";
import { constants, utils } from "ethers";

import { exchangeInterface, daiJoinInterface, defiInterface, vatInterface } from "../../abi";

const AddressZero = constants.AddressZero;
const { formatEther, Interface: { getEventTopic, getSighash } } = utils;

export const categorizeTransfer = (
  inputTransfer: Partial<Transfer>,
  txLogs: EthTransactionLog[],
  txTo: Address,
  addressBook: AddressBook,
  logger?: Logger,
): Transfer => {
  const transfer = JSON.parse(JSON.stringify(inputTransfer));
  const { isCategory, isSelf, getName } = addressBook;
  const log = logger.child({ module: "CategorizeTransfer" }); 

  log.debug(`Categorizing transfer of ${transfer.quantity} from ${
    getName(transfer.from)
  } to ${getName(transfer.to)}`);

  if (isSelf(transfer.from)) {

    // Doesn't matter if self-to-self
    if (isSelf(transfer.to)) {
      return transfer;
    } else {
      transfer.category = TransferCategories.Expense;
    }

  } else if (isSelf(transfer.to)) {
    transfer.category = TransferCategories.Income;

    // Doesn't matter if self-to-self or external-to-external
  } else {
    return transfer;
  }

  // eg Swap from 0-x exchange
  if (isCategory(AddressCategories.Exchange)(txTo)) {
    if (isSelf(transfer.to)) {
      transfer.category = TransferCategories.SwapIn;
    } else {
      transfer.category = TransferCategories.SwapOut;
    }
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
  } else if (isCategory(AddressCategories.Compound)(transfer.to)) {
    transfer.category = TransferCategories.Deposit;
    return transfer;

  // withdraw from compound v2
  } else if (isCategory(AddressCategories.Compound)(transfer.from)) {
    transfer.category = TransferCategories.Withdraw;
    return transfer;

  // gifts
  } else if (isCategory(AddressCategories.Family)(transfer.to)) {
    transfer.category = TransferCategories.GiftOut;
    return transfer;

  } else if (isCategory(AddressCategories.Family)(transfer.from)) {
    transfer.category = TransferCategories.GiftIn;
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

    // eg Oasis Dex
    if (isCategory(AddressCategories.Exchange)(txLog.address)) {
      const event = Object.values(exchangeInterface.events)
        .find(e => getEventTopic(e) === txLog.topics[0]);
      if (event && event.name === "LogTake") {
        const data = exchangeInterface.decodeEventLog(event, txLog.data, txLog.topics);
        if (math.eq(formatEther(data.take_amt), transfer.quantity)) {
          transfer.category = TransferCategories.SwapIn;
          break;
        } else if (math.eq(formatEther(data.give_amt), transfer.quantity)) {
          transfer.category = TransferCategories.SwapOut;
          break;
        }
      }

    // compound v2
    } else if (isCategory(AddressCategories.Compound)(txLog.address)) {
      const event = Object.values(defiInterface.events)
        .find(e => getEventTopic(e) === txLog.topics[0]);
      if (!event) { continue; }
      const data = defiInterface.decodeEventLog(event, txLog.data, txLog.topics);
      // Withdraw
      if (event.name === "Redeem" && math.eq(formatEther(data.redeemAmount), transfer.quantity)) {
        transfer.category = TransferCategories.Withdraw;
        if (transfer.from === AddressZero) {
          transfer.from = txLog.address;
        }
      // Deposit
      } else if (
        event.name === "Mint" && math.eq(formatEther(data.mintAmount), transfer.quantity)
      ) {
        transfer.category = TransferCategories.Deposit;
      }
    // makerdao stuff
    } else if (isCategory(AddressCategories.Defi)(txLog.address)) {

      // update dai addresses address zero params for compound v2
      if (
        getName(txLog.address) === "mcd-vat" &&
        txLog.topics[0].slice(0,10) ===
        getSighash(vatInterface.functions["move(address,address,uint256)"])
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

      } else if (
        getName(txLog.address) === "mcd-dai-join" &&
        txLog.topics[0].startsWith(getSighash(daiJoinInterface.functions["exit(address,uint256)"]))
      ) {
        const src = "0x" + txLog.topics[1].slice(26).toLowerCase();
        const dst = "0x" + txLog.topics[2].slice(26).toLowerCase();
        const amt = formatEther(txLog.topics[3]);
        if (
          getName(src) === "scd-mcd-migration" &&
          isSelf(dst) &&
          math.eq(amt, transfer.quantity) &&
          transfer.from === AddressZero
        ) {
          transfer.category = TransferCategories.SwapIn;
          transfer.from = src;
          break;
        }

      // eg compound v1
      } else {
        const event = Object.values(defiInterface.events)
          .find(e => getEventTopic(e) === txLog.topics[0]);
        if (!event) { continue; }
        const data = defiInterface.decodeEventLog(event, txLog.data, txLog.topics);
        if (
          math.eq(formatEther(data.amount), transfer.quantity) &&
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
    }

  }
  return transfer;
};
