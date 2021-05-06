import {
  AddressBook,
  AddressCategories,
  ChainData,
  EthCall,
  EthTransaction,
  Logger,
  Transaction,
  TransactionSources,
  Transfer,
  TransferCategories,
} from "@finances/types";
import { math, sm } from "@finances/utils";
import { BigNumber, constants, utils } from "ethers";

import { getTokenInterface } from "../../abi";

import { getERC20Parser } from "./erc20";
import { getCompoundParser } from "./compound";
import { getMakerParser } from "./maker";
import { getUniswapParser } from "./uniswap";
import { getYearnParser } from "./yearn";

const { hexlify, formatEther, formatUnits, keccak256, Interface: { getEventTopic }, RLP } = utils;
const { AddressZero } = constants;

export const parseEthTx = (
  ethTx: EthTransaction,
  addressBook: AddressBook,
  chainData: ChainData,
  logger: Logger,
): Transaction => {

  const { getName, isToken } = addressBook;
  const log = logger.child({ module: `Eth${ethTx.hash.substring(0, 8)}` });

  if (!ethTx.logs) {
    throw new Error(`Missing logs for tx ${ethTx.hash}, did fetchChainData get interrupted?`);
  }

  if (ethTx.to === null) {
    // derived from: https://ethereum.stackexchange.com/a/46960
    ethTx.to = `0x${keccak256(RLP.encode([ethTx.from, hexlify(ethTx.nonce)])).substring(26)}`;
    log.debug(`new contract deployed to ${ethTx.to}`);
  }

  let tx = {
    date: (new Date(ethTx.timestamp)).toISOString(),
    hash: ethTx.hash,
    sources: [TransactionSources.EthTx],
    tags: [],
    transfers: [{
      assetType: "ETH",
      category: TransferCategories.Transfer,
      fee: formatEther(BigNumber.from(ethTx.gasUsed).mul(ethTx.gasPrice)),
      from: sm(ethTx.from),
      index: -1, // ensure the initiating tx comes first in transfer list
      quantity: ethTx.value,
      to: sm(ethTx.to),
    }],
  } as Transaction;

  if (ethTx.status !== 1) {
    tx.transfers[0].quantity = "0";
    tx.description = `${getName(ethTx.from)} sent failed tx`;
    if (!addressBook.isSelf(tx.transfers[0].from)) {
      tx.transfers = [];
    }
    log.debug(tx, `Parsed a reverted eth tx`);
    return tx;
  }

  // Add internal eth calls to the transfers array
  chainData.getEthCalls((call: EthCall) => call.hash === ethTx.hash).forEach((call: EthCall) => {
    if (
      // Ignore non-eth transfers, we'll get those by parsing logs instead
      call.contractAddress === constants.AddressZero
      // Calls that don't interact with self addresses don't matter
      && (addressBook.isSelf(call.to) || addressBook.isSelf(call.from))
      // Calls with zero value don't matter
      && math.gt(call.value, "0")
    ) {
      tx.transfers.push({
        assetType: "ETH",
        category: TransferCategories.Transfer,
        // Internal eth transfers have no index, put incoming transfers first & outgoing last
        // This makes underflows less likely during VM processesing
        index: addressBook.isSelf(call.to) ? 0 : 10000,
        from: sm(call.from),
        quantity: call.value,
        to: sm(call.to),
      });
    }
  });

  // Sort transfers so that eth calls are first and incoming are before outgoing ones
  tx.transfers.sort((t1: Transfer, t2: Transfer): number => {
    if (t1.index !== t2.index) {
      return t2.index - t1.index;
    } else if (!addressBook.isSelf(t1.from) && addressBook.isSelf(t2.from)) {
      return -1;
    } else if (addressBook.isSelf(t1.from) && !addressBook.isSelf(t2.from)) {
      return 1;
    } else {
      return 0;
    }
  });

  let prevTx = { ethTx, tx };
  for (const parser of [
    getERC20Parser,
    getCompoundParser,
    getMakerParser,
    getUniswapParser,
    getYearnParser,
  ].map(parserGetter => parserGetter(addressBook, chainData, log))) {
    prevTx = parser(prevTx);
  }
  ethTx = prevTx.ethTx;
  tx = prevTx.tx;

  for (const txLog of ethTx.logs) {
    const address = sm(txLog.address);
    if (isToken(address)) {

      const assetType = getName(address);

      const iface = getTokenInterface(address);

      const event = Object.values(iface.events).find(e => getEventTopic(e) === txLog.topics[0]);

      if (!event) {
        log.warn(`Unable to identify ${assetType} event w topic: ${
          txLog.topics[0]
        }. Got events: ${Object.keys(iface.events)}`);
        continue;
      } else if (["AccrueInterest", "Approval"].includes(event.name)) {
        log.debug(`Skipping ${event.name} event`);
        continue;
      }

      let args;
      try {
        args = iface.parseLog(txLog).args;
      } catch (e) {
        log.warn(`Oh no: ${e.message}`);
      }
      const quantityStr = args.amount
        || args.borrowAmount
        || args.burnAmount
        || args.mintAmount
        || args.redeemAmount
        || args.repayAmount
        || args.value
        || args.wad;
      let quantity = "0";

      if (quantityStr) {
        quantity = formatUnits(quantityStr, chainData.getTokenData(address).decimals);
      } else {
        log.warn(`Couldn't find quantity in args: [${Object.keys(args)}]`);
      }

      const index = txLog.index;
      const transfer = { assetType, category: "Transfer", index, quantity } as Transfer;

      if (event.name === "Transfer") {
        log.debug(`${quantity} ${assetType} was transfered to ${args.to}`);
        transfer.from = args.from || args.src;
        transfer.to = args.to || args.dst;
        transfer.category = TransferCategories.Transfer;
        tx.transfers.push(transfer);

      // WETH
      } else if (assetType === "WETH" && event.name === "Deposit") {
        log.debug(`Deposit by ${args.dst} minted ${quantity} ${assetType}`);
        transfer.category = TransferCategories.SwapIn;
        tx.transfers.push({ ...transfer, from: address, to: args.dst });
      } else if (assetType === "WETH" && event.name === "Withdrawal") {
        log.debug(`Withdraw by ${args.dst} burnt ${quantity} ${assetType}`);
        transfer.category = TransferCategories.SwapOut;
        tx.transfers.push({ ...transfer, from: args.src, to: address });

      // MakerDAO SAI
      } else if (assetType === "SAI" && event.name === "Mint") {
        log.debug(`Minted ${quantity} ${assetType}`);
        transfer.category = TransferCategories.Borrow;
        tx.transfers.push({ ...transfer, from: AddressZero, to: args.guy });
      } else if (assetType === "SAI" && event.name === "Burn") {
        log.debug(`Burnt ${quantity} ${assetType}`);
        transfer.category = TransferCategories.Repay;
        tx.transfers.push({ ...transfer, from: args.guy, to: AddressZero });

      // Compound V2 cETH
      } else if (
        addressBook.isCategory(AddressCategories.Compound)(address)
      ) {
        if (addressBook.getName(address) === "cETH") {
          quantity = formatUnits(quantityStr, 18); // cETH decimals != ETH decimals
          if (event.name === "Borrow") {
            log.info(`Compound - Borrowed ${quantity} ETH`);
            tx.transfers.push({
              ...transfer,
              assetType: "ETH",
              category: TransferCategories.Borrow,
              from: address,
              to: args.borrower,
              quantity,
            });
          } else if (addressBook.getName(address) === "cETH" && event.name === "RepayBorrow") {
            log.info(`Compound - Repaid ${quantity} ETH`);
            tx.transfers.push({
              ...transfer,
              assetType: "ETH",
              category: TransferCategories.Repay,
              from: args.borrower,
              to: address,
              quantity,
            });
          }
        } else {
          log.debug(`Compound - Ignoring ${event.name} ${quantity} ${assetType}`);
        }

      } else if (event) {
        log.warn(`Unknown ${assetType} event: ${event.format()}`);
      }
    }
  }

  tx.transfers = tx.transfers
    .filter(transfer => addressBook.isSelf(transfer.to) || addressBook.isSelf(transfer.from))
    // Make sure addresses are lower-case
    .map(transfer => ({ ...transfer, from: sm(transfer.from), to: sm(transfer.to) }))
    // sort by index
    .sort((t1, t2) => t1.index - t2.index);

  ////////////////////////////////////////
  // Set a user-friendly tx description

  // Default description
  tx.description = `${getName(ethTx.to)} made ${tx.transfers.length} transfers`;

  if (tx.transfers.length === 0) {
    log.warn(tx, `Eth transaction has zero transfers`);
    return tx;

  } else if (tx.transfers.length === 1) {
    const transfer = tx.transfers[0];
    // ERC20 approval
    if (ethTx.data.startsWith("0x095ea7b3")) {
      tx.description = `${getName(transfer.from)} approved spending for ${
        getName(transfer.to)
      }`;
    } else if (!math.eq("0", transfer.quantity)) {
      tx.description = `${getName(transfer.from)} transfered ${
        math.round(transfer.quantity, 4)
      } ${transfer.assetType} to ${getName(transfer.to)}`;
    } else if (ethTx.data.length > 2) {
      tx.description = `${getName(transfer.from)} called a method on ${
        getName(transfer.to)
      }`;
    } else {
      tx.description = `${getName(transfer.from)} did nothing`;
    }

  // ERC20 transfer
  } else if (
    tx.transfers.length === 2 &&
    (ethTx.data.startsWith("0xa9059cbb") || math.eq("0", tx.transfers[0].quantity))
  ) {
    const transfer = tx.transfers[1];
    tx.description = `${getName(transfer.from)} transfered ${
      math.round(transfer.quantity, 4)
    } ${transfer.assetType} to ${getName(transfer.to)}`;

  // Uniswap swaps & deposit/withdraw liquidity
  } else if (
    getName(ethTx.to).startsWith("uniswap-router")
  ) {
    if (tx.transfers.length === 3) {
      if (
        addressBook.isSelf(tx.transfers[1].to) &&
        !addressBook.isSelf(tx.transfers[2].to)
      ) {
        tx.description = `${getName(ethTx.from)} swapped ${
          math.round(tx.transfers[2].quantity, 4)
        } ${tx.transfers[2].assetType} for ${
          math.round(tx.transfers[1].quantity, 4)
        } ${tx.transfers[1].assetType}`;
      } else if (
        !addressBook.isSelf(tx.transfers[1].to) &&
        addressBook.isSelf(tx.transfers[2].to)
      ) {
        tx.description = `${getName(ethTx.from)} swapped ${
          math.round(tx.transfers[1].quantity, 4)
        } ${tx.transfers[1].assetType} for ${
          math.round(tx.transfers[2].quantity, 4)
        } ${tx.transfers[2].assetType}`;
      }
    } else if (tx.transfers.length === 4) {
      if (
        addressBook.isSelf(tx.transfers[1].to) &&
        addressBook.isSelf(tx.transfers[2].to)
      ) {
        tx.description = `${getName(ethTx.from)} withdrew ${
          math.round(tx.transfers[1].quantity, 4)
        } ${tx.transfers[1].assetType} and ${
          math.round(tx.transfers[2].quantity, 4)
        } ${tx.transfers[2].assetType} from Uniswap`;
      } else if (
        !addressBook.isSelf(tx.transfers[1].to) &&
        !addressBook.isSelf(tx.transfers[2].to)
      ) {
        tx.description = `${getName(ethTx.from)} deposited ${
          math.round(tx.transfers[1].quantity, 4)
        } ${tx.transfers[1].assetType} and ${
          math.round(tx.transfers[2].quantity, 4)
        } ${tx.transfers[2].assetType} into Uniswap`;
      }
    }
  }

  log.debug(tx, `Parsed eth tx`);
  return tx;
};
