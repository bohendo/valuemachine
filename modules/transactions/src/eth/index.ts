import { isAddress } from "@ethersproject/address";
import { BigNumber } from "@ethersproject/bignumber";
import { AddressZero } from "@ethersproject/constants";
import { formatEther } from "@ethersproject/units";
import {
  Address,
  AddressBook,
  Assets,
  ChainData,
  EthCall,
  EthTransaction,
  Logger,
  Transaction,
  TransactionSources,
  TransferCategories,
  TransferCategory,
} from "@valuemachine/types";
import { gt, sm, getNewContractAddress } from "@valuemachine/utils";

import { argentAddresses, argentParser } from "./argent";
import { compoundAddresses, compoundParser } from "./compound";
import { erc20Addresses, erc20Parser } from "./erc20";
import { etherdeltaAddresses, etherdeltaParser } from "./etherdelta";
import { idleAddresses, idleParser } from "./idle";
import { makerAddresses, makerParser } from "./maker";
import { oasisAddresses, oasisParser } from "./oasis";
import { tornadoAddresses, tornadoParser } from "./tornado";
import { uniswapAddresses, uniswapParser } from "./uniswap";
import { wethAddresses, wethParser } from "./weth";
import { yearnAddresses, yearnParser } from "./yearn";

export const publicAddresses = [
  ...argentAddresses,
  ...compoundAddresses,
  ...etherdeltaAddresses,
  ...idleAddresses,
  ...erc20Addresses,
  ...makerAddresses,
  ...oasisAddresses,
  ...tornadoAddresses,
  ...uniswapAddresses,
  ...wethAddresses,
  ...yearnAddresses,
];

const { ETH } = Assets;

// Order matters!
// Complex parsers usually depend on simple ones so put ERC20 & weth first
const appParsers = [
  erc20Parser,
  wethParser,
  oasisParser,
  makerParser,
  compoundParser,
  etherdeltaParser,
  uniswapParser,
  idleParser,
  yearnParser,
  tornadoParser,
  argentParser,
];

const { Expense, Income, Internal, Unknown } = TransferCategories;

export const parseEthTx = (
  ethTx: EthTransaction,
  addressBook: AddressBook,
  chainData: ChainData,
  logger: Logger,
): Transaction => {
  const { isSelf } = addressBook;
  const log = logger.child({ module: `Eth${ethTx.hash.substring(0, 8)}` });
  // log.debug(ethTx, `Parsing eth tx`);

  const getSimpleCategory = (to: Address, from: Address): TransferCategory =>
    (isSelf(to) && isSelf(from)) ? Internal
    : (isSelf(from) && !isSelf(to)) ? Expense
    : (isSelf(to) && !isSelf(from)) ? Income
    : Unknown;

  if (!ethTx.logs) {
    throw new Error(`Missing logs for tx ${ethTx.hash}, did fetchChainData get interrupted?`);
  }

  let tx = {
    date: (new Date(ethTx.timestamp)).toISOString(),
    hash: ethTx.hash,
    sources: [],
    tags: [],
    transfers: [],
  } as Transaction;

  // Transaction Fee
  if (isSelf(ethTx.from)) {
    tx.transfers.push({
      asset: ETH,
      category: Expense,
      from: sm(ethTx.from),
      index: -1,
      quantity: formatEther(BigNumber.from(ethTx.gasUsed).mul(ethTx.gasPrice)),
      to: ETH,
    });
  }

  // Detect failed transactions
  if (ethTx.status !== 1) {
    tx.method = "Failure";
    log.info(`Detected a failed tx`);
    return tx;
  }

  // Transaction Value
  if (gt(ethTx.value, "0") && (isSelf(ethTx.to) || isSelf(ethTx.from))) {
    tx.transfers.push({
      asset: ETH,
      category: getSimpleCategory(ethTx.to, ethTx.from),
      from: sm(ethTx.from),
      index: 0,
      quantity: ethTx.value,
      to: sm(ethTx.to),
    });
  }

  // Detect contract creations
  if (ethTx.to === null) {
    // derived from: https://ethereum.stackexchange.com/a/46960
    const newContract = getNewContractAddress(ethTx.from, ethTx.nonce);
    ethTx.to = newContract; // overwrite to make later steps simpler
    tx.transfers[0].to = newContract;
    tx.method = "Create Contract";
    log.info(`Detected a newly created contract`);
  }

  // Add internal eth calls to the transfers array
  chainData.getEthCalls((call: EthCall) => call.hash === ethTx.hash).forEach((call: EthCall) => {
    if (
      // Ignore non-eth transfers, we'll get those by parsing tx logs instead
      call.contractAddress === AddressZero
      // Calls that don't interact with self addresses don't matter
      && (isSelf(call.to) || isSelf(call.from))
      // Calls with zero value don't matter
      && gt(call.value, "0")
    ) {
      tx.transfers.push({
        asset: ETH,
        category: getSimpleCategory(call.to, call.from),
        // Internal eth transfers have no index, put incoming transfers first & outgoing last
        // This makes underflows less likely during VM processesing
        index: isSelf(call.to) ? 1 : 10000,
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
      !isAddress(transfer.from) || isSelf(transfer.from) ||
      !isAddress(transfer.to) || isSelf(transfer.to)
    ) && (
      gt(transfer.quantity, "0")
    ))
    // Make sure all eth addresses are lower-case
    .map(transfer => ({
      ...transfer,
      from: transfer.from.startsWith("0x") ? sm(transfer.from) : transfer.from,
      to: transfer.to.startsWith("0x") ? sm(transfer.to) : transfer.to,
    }))
    // sort by index
    .sort((t1, t2) => t1.index - t2.index);

  log.debug(tx, `Parsed eth tx`);
  return tx;
};
