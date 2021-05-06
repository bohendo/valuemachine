import {
  AddressBook,
  AddressBookJson,
  AddressCategories,
  ChainData,
  Logger,
} from "@finances/types";
import { smeq } from "@finances/utils";

import { getUnique, IntermediateEthTx } from "../utils";

const tag = "ERC20";
export const erc20Addresses = [
  { name: "BAT", address: "0x0d8775f648430679a709e98d2b0cb6250d2887ef" },
  { name: "CHERRY", address: "0x4ecb692b0fedecd7b486b4c99044392784877e8c" },
  { name: "COMP", address: "0xc00e94cb662c3520282e6f5717214004a7f26888" },
  { name: "DAI", address: "0x6b175474e89094c44da98b954eedeac495271d0f" },
  { name: "GEN", address: "0x543ff227f64aa17ea132bf9886cab5db55dcaddf" },
  { name: "MKR", address: "0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2" },
  { name: "REP", address: "0xe94327d07fc17907b4db788e5adf2ed424addff6" },
  { name: "SAI", address: "0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359" },
  { name: "SNT", address: "0x744d70fdbe2ba4cf95131626614a1763df805b9e" },
  { name: "SNX", address: "0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f" },
  { name: "SNX-old", address: "0xc011a72400e58ecd99ee497cf89e3775d4bd732f" },
  { name: "sUSD", address: "0x57ab1ec28d129707052df4df418d58a2d46d5f51" },
  { name: "TORN", address: "0x77777feddddffc19ff86db637967013e6c6a116c" },
  { name: "UNI", address: "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984" },
  { name: "USDC", address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48" },
  { name: "USDT", address: "0xdac17f958d2ee523a2206206994597c13d831ec7" },
  { name: "WBTC", address: "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599" },
  { name: "WETH", address: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2" },
  { name: "YFI", address: "0x0bc529c00c6401aef6d220be8c6ea1667f6ad93e" },
].map(row => ({ ...row, category: AddressCategories.ERC20 })) as AddressBookJson;

export const getERC20Parser = (
  addressBook: AddressBook,
  chainData: ChainData,
  logger: Logger,
): any => (
  [ethTx, tx]: IntermediateEthTx, 
): IntermediateEthTx => {
  const log = logger.child({ module: tag });

  if (erc20Addresses.some(a => smeq(a.address, ethTx.to))) {
    log.info(`ERC20 tx detected!`);
    tx.tags = getUnique([tag, ...tx.tags]);
  }

  return [ethTx, tx];
};
