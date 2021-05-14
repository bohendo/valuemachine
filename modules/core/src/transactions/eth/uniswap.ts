import { Interface } from "@ethersproject/abi";
import {
  AddressBook,
  AddressBookJson,
  AddressCategories,
  ChainData,
  EthTransaction,
  Logger,
  Transaction,
  TransactionSources,
  Transfer,
  TransferCategories,
} from "@finances/types";
import { math, sm, smeq } from "@finances/utils";

import { getUnique, parseEvent } from "../utils";

const { round } = math;
const source = TransactionSources.Uniswap;

////////////////////////////////////////
/// Addresses

const routerAddresses = [
  { name: "UniswapV2", address: "0x7a250d5630b4cf539739df2c5dacb4c659f2488d" },
].map(row => ({ ...row, category: AddressCategories.Defi })) as AddressBookJson;

const govTokenAddresses = [
  { name: "UNI", address: "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984" },
].map(row => ({ ...row, category: AddressCategories.ERC20 })) as AddressBookJson;

const v1MarketAddresses = [
  { name: "UniV1-cDAI", address: "0x45a2fdfed7f7a2c791fb1bdf6075b83fad821dde" },
  { name: "UniV1-DAI", address: "0x2a1530c4c41db0b0b2bb646cb5eb1a67b7158667" },
  { name: "UniV1-GEN", address: "0x26cc0eab6cb650b0db4d0d0da8cb5bf69f4ad692" },
  { name: "UniV1-MKR", address: "0x2c4bd064b998838076fa341a83d007fc2fa50957" },
  { name: "UniV1-SAI", address: "0x09cabec1ead1c0ba254b09efb3ee13841712be14" },
  { name: "UniV1-SPANK", address: "0x4e395304655f0796bc3bc63709db72173b9ddf98" },
  { name: "UniV1-SNX", address: "0x3958b4ec427f8fa24eb60f42821760e88d485f7f" },
  { name: "UniV1-sUSD", address: "0xb944d13b2f4047fc7bd3f7013bcf01b115fb260d" },
].map(row => ({ ...row, category: AddressCategories.Defi })) as AddressBookJson;

const v2MarketAddresses = [
  { name: "UniV2-ETH-AAVE", address: "0xdfc14d2af169b0d36c4eff567ada9b2e0cae044f" },
  { name: "UniV2-ETH-DAI", address: "0xa478c2975ab1ea89e8196811f51a7b7ade33eb11" },
  { name: "UniV2-ETH-FEI", address: "0x94b0a3d511b6ecdb17ebf877278ab030acb0a878" },
  { name: "UniV2-ETH-MKR", address: "0xc2adda861f89bbb333c90c492cb837741916a225" },
  { name: "UniV2-ETH-RAI", address: "0x8ae720a71622e824f576b4a8c03031066548a3b1" },
  { name: "UniV2-ETH-TORN", address: "0x0c722a487876989af8a05fffb6e32e45cc23fb3a" },
  { name: "UniV2-ETH-UNI", address: "0xd3d2e2692501a5c9ca623199d38826e513033a17" },
  { name: "UniV2-ETH-USDC", address: "0xb4e16d0168e52d35cacd2c6185b44281ec28c9dc" },
  { name: "UniV2-ETH-USDT", address: "0x0d4a11d5eeaac28ec3f61d100daf4d40471f1852" },
  { name: "UniV2-ETH-WBTC", address: "0xbb2b8038a1640196fbe3e38816f3e67cba72d940" },
  { name: "UniV2-ETH-YFI", address: "0x2fdbadf3c4d5a8666bc06645b8358ab803996e28" },
  { name: "UniV2-ETH-ycrvUSD", address: "0x55df969467ebdf954fe33470ed9c3c0f8fab0816" },
].map(row => ({ ...row, category: AddressCategories.ERC20 })) as AddressBookJson;

export const uniswapAddresses = [
  ...govTokenAddresses,
  ...routerAddresses,
  ...v1MarketAddresses,
  ...v2MarketAddresses,
];

////////////////////////////////////////
/// Interfaces

const uniswapV1Interface = new Interface([
  "event AddLiquidity(address indexed provider, uint256 indexed eth_amount, uint256 indexed token_amount)",
  "event Approval(address indexed _owner, address indexed _spender, uint256 _value)",
  "event EthPurchase(address indexed buyer, uint256 indexed tokens_sold, uint256 indexed eth_bought)",
  "event RemoveLiquidity(address indexed provider, uint256 indexed eth_amount, uint256 indexed token_amount)",
  "event TokenPurchase(address indexed buyer, uint256 indexed eth_sold, uint256 indexed tokens_bought)",
  "event Transfer(address indexed _from, address indexed _to, uint256 _value)",
]);

const uniswapV2Interface = new Interface([
  "event Approval(address indexed owner, address indexed spender, uint256 value)",
  "event Burn(address indexed sender, uint256 amount0, uint256 amount1, address indexed to)",
  "event Mint(address indexed sender, uint256 amount0, uint256 amount1)",
  "event Swap(address indexed sender, uint256 amount0In, uint256 amount1In, uint256 amount0Out, uint256 amount1Out, address indexed to)",
  "event Sync(uint112 reserve0, uint112 reserve1)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
]);

////////////////////////////////////////
/// Parser

export const uniswapParser = (
  tx: Transaction,
  ethTx: EthTransaction,
  addressBook: AddressBook,
  chainData: ChainData,
  logger: Logger,
): Transaction => {
  const log = logger.child({ module: `${source}${ethTx.hash.substring(0, 6)}` });
  const { getName, isSelf } = addressBook;

  const getSwaps = () => {
    const swapsOut = tx.transfers.filter((transfer: Transfer): boolean =>
      isSelf(transfer.from)
        && uniswapAddresses.some(e => smeq(transfer.to, e.address))
        && ([
          TransferCategories.Transfer,
          TransferCategories.SwapOut,
        ] as TransferCategories[]).includes(transfer.category)
    );
    const swapsIn = tx.transfers.filter((transfer: Transfer): boolean =>
      isSelf(transfer.to)
        && uniswapAddresses.some(e => smeq(transfer.from, e.address))
        && ([
          TransferCategories.Transfer, 
          TransferCategories.SwapIn,
        ] as TransferCategories[]).includes(transfer.category)
    );
    // SwapIn entries for assets that don't exist in swapsOut should come first
    const ofType = asset => swap => swap.assetType === asset;
    swapsIn.sort((s1, s2) =>
      swapsOut.filter(ofType(s1.assetType)).length - swapsOut.filter(ofType(s2.assetType)).length
    );
    return { in: swapsIn, out: swapsOut };
  };

  for (const txLog of ethTx.logs.filter(
    l => uniswapAddresses.some(e => smeq(e.address, l.address))
  )) {
    const address = sm(txLog.address);
    const index = txLog.index || 1;
    tx.sources = getUnique([source, ...tx.sources]) as TransactionSources[];

    // Parse v1 or v2 events
    let subsrc, event;
    if (v2MarketAddresses.some(e => smeq(e.address, address))) {
      subsrc = `${source}V2`;
      event = parseEvent(uniswapV2Interface, txLog);
    } else if (v1MarketAddresses.some(e => smeq(e.address, address))) {
      subsrc = `${source}V1`;
      event = parseEvent(uniswapV1Interface, txLog);
    } else {
      log.debug(`Skipping ${getName(address)} event`);
      continue;
    }

    if ([
      "EthPurchase", "TokenPurchase", "AddLiquidity", "RemoveLiquidity", // V1
      "Swap", "Mint", "Burn", // V2
    ].includes(event.name)) {
      const swaps = getSwaps();
      if (!swaps.in.length || !swaps.out.length) {
        log.warn(`Missing ${subsrc} swaps: in=${swaps.in.length} out=${swaps.out.length}`);
        continue;
      }
      log.info(`Parsing ${subsrc} ${event.name}`);
      swaps.in.map(swap => { swap.category = TransferCategories.SwapIn; return swap; });
      swaps.out.map(swap => { swap.category = TransferCategories.SwapOut; return swap; });
      swaps.in.forEach(swap => { swap.index = swap.index || index; });
      if (["Swap", "EthPurchase", "TokenPurchase"].includes(event.name)) {
        tx.description = `${getName(ethTx.from)} swapped ${
          round(swaps.out[0].quantity)
        } ${swaps.out[0].assetType}${swaps.out.length > 1 ? ", etc" : ""} for ${
          round(swaps.in[0].quantity)
        } ${swaps.in[0].assetType}${swaps.in.length > 1 ? ", etc" : ""} via ${subsrc}`;
      } else if (["Mint", "AddLiquidity"].includes(event.name)) {
        tx.description = `${getName(ethTx.from)} deposited ${
          round(swaps.out[0].quantity)
        } ${swaps.out[0].assetType} and ${
          round(swaps.out[1].quantity)
        } ${swaps.out[1].assetType} into ${subsrc}`;
      } else if (["Burn", "RemoveLiquidity"].includes(event.name)) {
        tx.description = `${getName(ethTx.from)} withdrew ${
          round(swaps.in[0].quantity)
        } ${swaps.in[0].assetType} and ${
          round(swaps.in[1].quantity)
        } ${swaps.in[1].assetType} from ${subsrc}`;
      } else {
        log.warn(`Missing ${event.name} swaps: in=${swaps.in.length} out=${swaps.out.length}`);
      }
    } else {
      log.debug(`Skipping ${subsrc} ${event.name}`);
    }
  }

  // log.debug(tx, `Done parsing ${source}`);
  return tx;
};
