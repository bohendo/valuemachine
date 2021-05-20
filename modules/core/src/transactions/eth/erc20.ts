import { Interface } from "@ethersproject/abi";
import { AddressZero } from "@ethersproject/constants";
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

import { rmDups, parseEvent } from "../utils";

const { round } = math;
const {
  BAT, CHERRY, GEN, GNO, GRT, OMG, REP, REPv1, SNT, SNX,
  SNXv1, SPANK, sUSD, sUSDv1, USDC, USDT, WBTC, ZRX,
} = AssetTypes;

const source = TransactionSources.ERC20;

////////////////////////////////////////
/// Addresses

// Simple, standalone tokens only. App-specific tokens can be found in that app's parser.
export const erc20Addresses = [
  { name: BAT, address: "0x0d8775f648430679a709e98d2b0cb6250d2887ef" },
  { name: CHERRY, address: "0x4ecb692b0fedecd7b486b4c99044392784877e8c" },
  { name: GEN, address: "0x543ff227f64aa17ea132bf9886cab5db55dcaddf" },
  { name: GNO, address: "0x6810e776880c02933d47db1b9fc05908e5386b96" },
  { name: GRT, address: "0xc944e90c64b2c07662a292be6244bdf05cda44a7" },
  { name: OMG, address: "0xd26114cd6ee289accf82350c8d8487fedb8a0c07" },
  { name: REP, address: "0xe94327d07fc17907b4db788e5adf2ed424addff6" },
  { name: REPv1, address: "0x1985365e9f78359a9b6ad760e32412f4a445e862" },
  { name: SNT, address: "0x744d70fdbe2ba4cf95131626614a1763df805b9e" },
  { name: SNX, address: "0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f" },
  { name: SNXv1, address: "0xc011a72400e58ecd99ee497cf89e3775d4bd732f" },
  { name: SPANK, address: "0x42d6622dece394b54999fbd73d108123806f6a18" },
  { name: sUSD, address: "0x57ab1ec28d129707052df4df418d58a2d46d5f51" },
  { name: sUSDv1, address: "0x57ab1e02fee23774580c119740129eac7081e9d3" },
  { name: USDC, address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48" },
  { name: USDT, address: "0xdac17f958d2ee523a2206206994597c13d831ec7" },
  { name: WBTC, address: "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599" },
  { name: ZRX, address: "0xe41d2489571d322189246dafa5ebde1f4699f498" },
].map(row => ({ ...row, category: AddressCategories.ERC20 })) as AddressBookJson;

////////////////////////////////////////
/// ABIs

const erc20Interface = new Interface([
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
  const { getName, isSelf, isToken } = addressBook;

  for (const txLog of ethTx.logs) {
    const address = sm(txLog.address);
    // Only parse known, ERC20 compliant tokens
    if (isToken(address)) {
      const event = parseEvent(erc20Interface, txLog);
      if (!event.name) continue;
      tx.sources = rmDups([source, ...tx.sources]) as TransactionSources[];
      const assetType = getName(address) as AssetTypes;
      // Skip transfers that don't concern self accounts
      if (!isSelf(event.args.from) && !isSelf(event.args.to)) {
        log.debug(`Skipping ${assetType} ${event.name} that doesn't involve us`);
        continue;
      }
      const amount = formatUnits(
        event.args.amount,
        chainData.getTokenData(address)?.decimals || 18,
      );

      if (event.name === "Transfer") {
        log.info(`Parsing ${source} ${event.name} of ${amount} ${assetType}`);
        tx.transfers.push({
          assetType,
          category: TransferCategories.Transfer,
          from: event.args.from === AddressZero ? address : event.args.from,
          index: txLog.index,
          quantity: amount,
          to: event.args.to === AddressZero ? address : event.args.to,
        });
        if (smeq(ethTx.to, address)) {
          tx.description = `${getName(event.args.from)} transfered ${
            round(amount, 4)
          } ${assetType} to ${getName(event.args.to)}`;
        }

      } else if (event.name === "Approval") {
        log.info(`Parsing ${source} ${event.name} event for ${assetType}`);
        if (smeq(ethTx.to, address)) {
          const amt = round(amount, 2);
          tx.description = `${getName(event.args.from)} approved ${
            getName(event.args.to)
          } to spend ${amt.length > 10 ? "a lot of" : amt} ${assetType}`;
        }

      } else {
        log.warn(event, `Unknown ${assetType} event`);
      }

    }
  }

  // log.debug(tx, `Done parsing ${source}`);
  return tx;
};
