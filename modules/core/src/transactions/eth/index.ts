import { BigNumber } from "@ethersproject/bignumber";
import { hexlify } from "@ethersproject/bytes";
import { AddressZero } from "@ethersproject/constants";
import { keccak256 } from "@ethersproject/keccak256";
import { encode } from "@ethersproject/rlp";
import { formatEther } from "@ethersproject/units";
import {
  AddressBook,
  ChainData,
  EthCall,
  EthTransaction,
  Logger,
  Transaction,
  TransactionSources,
  TransferCategories,
} from "@finances/types";
import { math, sm } from "@finances/utils";

import { compoundAddresses, compoundParser } from "./compound";
import { erc20Addresses, erc20Parser } from "./erc20";
import { makerAddresses, makerParser } from "./maker";
import { oasisAddresses, oasisParser } from "./oasis";
import { tornadoAddresses, tornadoParser } from "./tornado";
import { uniswapAddresses, uniswapParser } from "./uniswap";
import { wethAddresses, wethParser } from "./weth";
import { yearnAddresses, yearnParser } from "./yearn";

export const publicAddresses = [
  ...compoundAddresses,
  ...erc20Addresses,
  ...makerAddresses,
  ...oasisAddresses,
  ...tornadoAddresses,
  ...uniswapAddresses,
  ...wethAddresses,
  ...yearnAddresses,
];

const { gt, eq, round } = math;

// Order matters!
// Complex parsers usually depend on simple ones so put ERC20 & weth first
const appParsers = [
  erc20Parser,
  wethParser,
  oasisParser,
  makerParser,
  compoundParser,
  uniswapParser,
  yearnParser,
  tornadoParser,
];

export const parseEthTx = (
  ethTx: EthTransaction,
  addressBook: AddressBook,
  chainData: ChainData,
  logger: Logger,
): Transaction => {

  const { getName } = addressBook;
  const log = logger.child({ module: `Eth${ethTx.hash.substring(0, 8)}` });
  // log.debug(ethTx, `Parsing eth tx`);

  if (!ethTx.logs) {
    throw new Error(`Missing logs for tx ${ethTx.hash}, did fetchChainData get interrupted?`);
  }

  let tx = {
    date: (new Date(ethTx.timestamp)).toISOString(),
    hash: ethTx.hash,
    prices: {},
    sources: [],
    tags: [],
    transfers: [{
      assetType: "ETH",
      category: gt(ethTx.value, "0") ? TransferCategories.Transfer : TransferCategories.Expense,
      fee: formatEther(BigNumber.from(ethTx.gasUsed).mul(ethTx.gasPrice)),
      from: sm(ethTx.from),
      index: -1, // ensure the initiating tx comes first in transfer list
      quantity: ethTx.value,
      to: sm(ethTx.to || ""),
    }],
  } as Transaction;

  // Detect contract creations
  if (ethTx.to === null) {
    // derived from: https://ethereum.stackexchange.com/a/46960
    const newContract = sm(`0x${
      keccak256(encode([ethTx.from, hexlify(ethTx.nonce)])).substring(26)
    }`);
    ethTx.to = newContract; // overwrite to make later steps simpler
    tx.transfers[0].to = newContract;
    tx.description = `${getName(ethTx.from)} created a new contract: ${getName(newContract)}`;
    log.info(`Detected a newly created contract`);
  }

  // Detect failed transactions
  if (ethTx.status !== 1) {
    tx.transfers[0].quantity = "0";
    tx.description = `${getName(ethTx.from)} sent failed tx to ${getName(ethTx.to)}`;
    if (!addressBook.isSelf(tx.transfers[0].from)) {
      tx.transfers = [];
    }
    log.info(`Detected a failed tx`);
    return tx;
  }

  // Add internal eth calls to the transfers array
  chainData.getEthCalls((call: EthCall) => call.hash === ethTx.hash).forEach((call: EthCall) => {
    if (
      // Ignore non-eth transfers, we'll get those by parsing logs instead
      call.contractAddress === AddressZero
      // Calls that don't interact with self addresses don't matter
      && (addressBook.isSelf(call.to) || addressBook.isSelf(call.from))
      // Calls with zero value don't matter
      && gt(call.value, "0")
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

  // Activate pipeline of app-specific parsers
  appParsers.forEach(parser => {
    try {
      tx = parser(tx, ethTx, addressBook, chainData, log);
    } catch (e) {
      log.warn(e);
    }
  });

  // Give a default eth-related source if no app-specific parsers were triggered
  if (!tx.sources.length) {
    tx.sources.push(TransactionSources.EthTx);
  }

  tx.transfers = tx.transfers
    // Filter out no-op transfers
    .filter(transfer => (
      addressBook.isSelf(transfer.to) || addressBook.isSelf(transfer.from)
    ) && (
      gt(transfer.quantity, "0") || gt(transfer.fee || "0", "0")
    ))
    // Make sure all eth addresses are lower-case
    .map(transfer => ({ ...transfer, from: sm(transfer.from), to: sm(transfer.to) }))
    // sort by index
    .sort((t1, t2) => t1.index - t2.index);

  // Set a default tx description
  if (!tx.description) {
    if (tx.transfers.length < 1) {
      tx.description = `${getName(ethTx.from)} did nothing`;
    } else if (tx.transfers.length > 1) {
      tx.description = `${getName(ethTx.to)} made ${tx.transfers.length} transfers`;
    } else {
      if (!eq("0", tx.transfers[0]?.quantity)) {
        tx.description = `${getName(tx.transfers[0].from)} transfered ${
          round(tx.transfers[0].quantity, 4)
        } ${tx.transfers[0].assetType} to ${getName(tx.transfers[0].to)}`;
      } else if (ethTx.data.length > 2) {
        tx.description = `${getName(tx.transfers[0].from)} called a method on ${
          getName(tx.transfers[0].to)
        }`;
      } else {
        tx.description = `${getName(tx.transfers[0].from)} did nothing`;
      }
    }
  }

  log.debug(tx, `Parsed eth tx`);
  return tx;
};
