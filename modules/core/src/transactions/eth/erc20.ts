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
  TransferCategories,
} from "@finances/types";
import { math, sm, smeq } from "@finances/utils";

import { getUnique } from "../utils";

const { round } = math;

const tag = "ERC20";
export const erc20Addresses = [
  { name: "BAT", address: "0x0d8775f648430679a709e98d2b0cb6250d2887ef" },
  { name: "CHERRY", address: "0x4ecb692b0fedecd7b486b4c99044392784877e8c" },
  { name: "COMP", address: "0xc00e94cb662c3520282e6f5717214004a7f26888" },
  { name: "DAI", address: "0x6b175474e89094c44da98b954eedeac495271d0f" },
  { name: "GEN", address: "0x543ff227f64aa17ea132bf9886cab5db55dcaddf" },
  { name: "MKR", address: "0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2" },
  { name: "REP", address: "0xe94327d07fc17907b4db788e5adf2ed424addff6" },
  { name: "REPv1", address: "0x1985365e9f78359a9b6ad760e32412f4a445e862" },
  { name: "SAI", address: "0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359" },
  { name: "SNT", address: "0x744d70fdbe2ba4cf95131626614a1763df805b9e" },
  { name: "SNX", address: "0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f" },
  { name: "SNXv1", address: "0xc011a72400e58ecd99ee497cf89e3775d4bd732f" },
  { name: "sUSD", address: "0x57ab1ec28d129707052df4df418d58a2d46d5f51" },
  { name: "TORN", address: "0x77777feddddffc19ff86db637967013e6c6a116c" },
  { name: "UNI", address: "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984" },
  { name: "USDC", address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48" },
  { name: "USDT", address: "0xdac17f958d2ee523a2206206994597c13d831ec7" },
  { name: "WBTC", address: "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599" },
  { name: "WETH", address: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2" },
  { name: "YFI", address: "0x0bc529c00c6401aef6d220be8c6ea1667f6ad93e" },
  { name: "ZRX", address: "0xe41d2489571d322189246dafa5ebde1f4699f498" },
].map(row => ({ ...row, category: AddressCategories.ERC20 })) as AddressBookJson;

const ERC20 = new Interface([
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

export const getERC20Parser = (
  ethTx: EthTransaction,
  addressBook: AddressBook,
  chainData: ChainData,
  logger: Logger,
) => (
  tx: Transaction,
): Transaction => {
  const log = logger.child({ module: tag });
  const { getName, isToken } = addressBook;


  for (const txLog of ethTx.logs) {
    const address = sm(txLog.address);
    const event = Object.values(ERC20.events).find(e =>
      Interface.getEventTopic(e) === txLog.topics[0]
    );
    if (
      erc20Addresses.some(a => smeq(a.address, address))
      || !isToken(address)
      || event
    ) {
      const assetType = getName(address) as AssetTypes;
      log.info(`Found an ERC20 ${event.name} event for ${assetType}`);

      const args = ERC20.parseLog(txLog).args;
      const amount = formatUnits(args.amount, chainData.getTokenData(address).decimals);

      if (event.name === "Transfer") {
        tx.description = `${getName(args.from)} transfered ${
          round(amount, 4)
        } ${assetType} to ${getName(args.to)}`;
        tx.tags = getUnique([tag, ...tx.tags]);
        tx.transfers.push({
          assetType,
          category: TransferCategories.Transfer,
          from: args.from,
          index: txLog.index,
          quantity: amount,
          to: args.to,
        });

      } else if (event.name === "Approval") {
        const amt = round(amount, 2);
        tx.description = `${getName(ethTx.from)} approved ${getName(args.to)} to spend ${
          amt.length > 6 ? "a lot of" : amt
        } ${assetType}`;
        tx.tags = getUnique([tag, ...tx.tags]);

      } else {
        log.warn(event, `Unknown ${assetType} event`);
      }

      /* WETH
      } else if (assetType === "WETH" && event.name === "Deposit") {
        log.debug(`Deposit by ${args.dst} minted ${quantity} ${assetType}`);
        transfer.category = TransferCategories.SwapIn;
        tx.transfers.push({ ...transfer, from: address, to: args.dst });
      } else if (assetType === "WETH" && event.name === "Withdrawal") {
        log.debug(`Withdraw by ${args.dst} burnt ${quantity} ${assetType}`);
        transfer.category = TransferCategories.SwapOut;
        tx.transfers.push({ ...transfer, from: args.src, to: address });
      }
      */

    }
  }

  return tx;
};
