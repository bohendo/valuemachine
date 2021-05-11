import { Interface } from "@ethersproject/abi";
import { formatUnits } from "@ethersproject/units";
import {
  AddressBook,
  AddressBookJson,
  AddressCategories,
  AssetTypes,
  ChainData,
  EthTransaction,
  Logger,
  Transaction,
  TransactionSources,
  TransferCategories,
} from "@finances/types";
import { math, sm, smeq } from "@finances/utils";

import { getUnique } from "../utils";

const { round } = math;

const source = TransactionSources.ERC20;

////////////////////////////////////////
/// Addresses

// Simple, standalone tokens only. App-specific tokens can be found in that app's parser.
export const erc20Addresses = [
  { name: "BAT", address: "0x0d8775f648430679a709e98d2b0cb6250d2887ef" },
  { name: "CHERRY", address: "0x4ecb692b0fedecd7b486b4c99044392784877e8c" },
  { name: "GEN", address: "0x543ff227f64aa17ea132bf9886cab5db55dcaddf" },
  { name: "REP", address: "0xe94327d07fc17907b4db788e5adf2ed424addff6" },
  { name: "REPv1", address: "0x1985365e9f78359a9b6ad760e32412f4a445e862" },
  { name: "SNT", address: "0x744d70fdbe2ba4cf95131626614a1763df805b9e" },
  { name: "SNX", address: "0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f" },
  { name: "SNXv1", address: "0xc011a72400e58ecd99ee497cf89e3775d4bd732f" },
  { name: "sUSD", address: "0x57ab1ec28d129707052df4df418d58a2d46d5f51" },
  { name: "TORN", address: "0x77777feddddffc19ff86db637967013e6c6a116c" },
  { name: "USDC", address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48" },
  { name: "USDT", address: "0xdac17f958d2ee523a2206206994597c13d831ec7" },
  { name: "WBTC", address: "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599" },
  { name: "ZRX", address: "0xe41d2489571d322189246dafa5ebde1f4699f498" },
].map(row => ({ ...row, category: AddressCategories.ERC20 })) as AddressBookJson;

////////////////////////////////////////
/// ABIs

const iface = new Interface([
  "event Approval(address indexed from, address indexed to, uint amount)",
  "event Transfer(address indexed from, address indexed to, uint amount)",
  "function allowance(address owner, address spender) view returns (uint)",
  "function approve(address spender, uint amount) returns (bool)",
  "function balanceOf(address owner) view returns (uint)",
  "function decimals() view returns (uint)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function totalSupply() view returns (uint)",
  "function transfer(address recipient, uint amount)",
  "function transferFrom(address sender, address recipient, uint amount)"
]);

////////////////////////////////////////
/// Parser

export const erc20Parser = (
  tx: Transaction,
  ethTx: EthTransaction,
  addressBook: AddressBook,
  chainData: ChainData,
  logger: Logger,
): Transaction => {
  const log = logger.child({ module: `${source}${ethTx.hash.substring(0, 6)}` });
  const { getName, isProxy, isSelf, isToken } = addressBook;

  const isSelfy = (address: string): boolean =>
    isSelf(address) || (
      isSelf(ethTx.from) && isProxy(address) && smeq(address, ethTx.to)
    );

  for (const txLog of ethTx.logs) {
    const address = sm(txLog.address);
    const event = Object.values(iface.events).find(e =>
      Interface.getEventTopic(e) === txLog.topics[0]
    );
    // Only parse known, ERC20 compliant tokens
    if (event && isToken(address)) {
      const args = iface.parseLog(txLog).args;
      const assetType = getName(address) as AssetTypes;
      // Skip transfers that don't concern self accounts
      if (!isSelfy(args.from) && !isSelfy(args.to)) {
        log.debug(`Skipping ${assetType} ${event.name} that doesn't involve us`);
        continue;
      }
      const amount = formatUnits(args.amount, chainData.getTokenData(address).decimals);

      if (event.name === "Transfer") {
        log.info(`Parsing ${source} ${event.name} event for ${assetType}`);
        if (smeq(ethTx.to, address)) {
          tx.description = `${getName(args.from)} transfered ${
            round(amount, 4)
          } ${assetType} to ${getName(args.to)}`;
        }
        tx.sources = getUnique([source, ...tx.sources]) as TransactionSources[];
        tx.transfers.push({
          assetType,
          category: TransferCategories.Transfer,
          from: args.from,
          index: txLog.index,
          quantity: amount,
          to: args.to,
        });

      } else if (event.name === "Approval") {
        log.info(`Parsing ${source} ${event.name} event for ${assetType}`);
        if (smeq(ethTx.to, address)) {
          const amt = round(amount, 2);
          tx.description = `${getName(args.from)} approved ${getName(args.to)} to spend ${
            amt.length > 6 ? "a lot of" : amt
          } ${assetType}`;
        }
        tx.sources = getUnique([source, ...tx.sources]) as TransactionSources[];

      } else {
        log.warn(event, `Unknown ${assetType} event`);
      }

    }
  }

  // log.debug(tx, `Done parsing ${source}`);
  return tx;
};
