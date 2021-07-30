import { Interface } from "@ethersproject/abi";
import { getAddress } from "@ethersproject/address";
import { formatUnits } from "@ethersproject/units";
import { AddressZero } from "@ethersproject/constants";
import {
  AddressBook,
  AddressCategories,
  Assets,
  EvmTransaction,
  Logger,
  Transaction,
  TransferCategories,
} from "@valuemachine/types";
import {
  parseEvent,
  rmDups,
} from "@valuemachine/utils";

import { setAddressCategory } from "./utils";

export const erc20Source = "ERC20";

const { DAI, USDC, USDT, WBTC, WETH, MATIC, WMATIC } = Assets;
const { Expense, Income, Internal, Unknown } = TransferCategories;

export const erc20Addresses = [
  { name: DAI, address: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063" },
  { name: USDC, address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", decimals: 6 },
  { name: USDT, address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", decimals: 6 },
  { name: WBTC, address: "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6", decimals: 8 },
  { name: WETH, address: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619" },
  { name: WMATIC, address: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270" },
].map(setAddressCategory(AddressCategories.ERC20));

////////////////////////////////////////
/// Interfaces

const erc20Interface = new Interface([
  "event Approval(address indexed from, address indexed to, uint amount)",
  "event Transfer(address indexed from, address indexed to, uint amount)",
]);

////////////////////////////////////////
/// Parser

const getAccount = address => `${MATIC}-${getAddress(address)}`;

export const erc20Parser = (
  tx: Transaction,
  ethTx: EvmTransaction,
  addressBook: AddressBook,
  logger: Logger,
): Transaction => {
  const log = logger.child({ module: erc20Source });
  const { getDecimals, getName, isSelf, isToken } = addressBook;

  for (const txLog of ethTx.logs) {
    const address = txLog.address;

    // Parse ERC20 compliant tokens
    if (isToken(address)) {
      const source = "ERC20";
      const event = parseEvent(erc20Interface, txLog);
      if (!event.name) continue;
      tx.sources = rmDups([source, ...tx.sources]);
      const asset = getName(address);
      // Skip transfers that don't concern self accounts
      if (!isSelf(event.args.from) && !isSelf(event.args.to)) {
        log.debug(`Skipping ${asset} ${event.name} that doesn't involve us`);
        continue;
      }
      const amount = formatUnits(event.args.amount, getDecimals(address));
      if (event.name === "Transfer") {
        log.debug(`Parsing ${source} ${event.name} of ${amount} ${asset}`);
        const from = event.args.from === AddressZero ? address : event.args.from;
        const to = event.args.to === AddressZero ? address : event.args.to;
        const category = isSelf(from) && isSelf(to) ? Internal
          : isSelf(from) && !isSelf(to) ? Expense
          : isSelf(to) && !isSelf(from) ? Income
          : Unknown;
        tx.transfers.push({
          asset,
          category,
          from: getAccount(from),
          index: txLog.index,
          quantity: amount,
          to: getAccount(to),
        });
        if (ethTx.to === address) {
          tx.method = `${asset} ${event.name}`;
        }
      } else if (event.name === "Approval") {
        log.debug(`Parsing ${source} ${event.name} event for ${asset}`);
        if (ethTx.to === address) {
          tx.method = `${asset} ${event.name}`;
        }
      } else {
        log.warn(event, `Unknown ${asset} event`);
      }
    }

  }

  return tx;
};

