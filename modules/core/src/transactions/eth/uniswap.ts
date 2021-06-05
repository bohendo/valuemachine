import { Interface } from "@ethersproject/abi";
import {
  Assets,
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
  TransferCategory,
} from "@finances/types";
import { math, sm, smeq } from "@finances/utils";

import { rmDups, parseEvent } from "../utils";

const { round } = math;
const { UNI,
  UniV2_1INCH_ETH, UniV2_AAVE_ETH, UniV2_COMP_ETH, UniV2_CREAM_ETH, UniV2_DAI_ETH, UniV2_DAI_USDC,
  UniV2_DPI_ETH, UniV2_ESD_USDC, UniV2_ETH_AMPL, UniV2_ETH_cDAI, UniV2_ETH_CHERRY, UniV2_ETH_CRV,
  UniV2_ETH_GEN, UniV2_ETH_GRT, UniV2_ETH_renBTC, UniV2_ETH_TRU, UniV2_ETH_USDT, UniV2_ETH_ycrvUSD,
  UniV2_FEI_ETH, UniV2_HEX_ETH, UniV2_LINK_ETH, UniV2_LRC_ETH, UniV2_LUSD_ETH, UniV2_MATIC_ETH,
  UniV2_MKR_ETH, UniV2_PICKLE_ETH, UniV2_RAI_ETH, UniV2_REN_ETH, UniV2_SHIB_ETH, UniV2_SNX_ETH,
  UniV2_sUSD_ETH, UniV2_SUSHI_ETH, UniV2_TORN_ETH, UniV2_UNI_ETH, UniV2_USDC_DSD, UniV2_USDC_ETH,
  UniV2_USDC_GRT, UniV2_USDC_USDT, UniV2_WBTC_ETH, UniV2_WBTC_USDC, UniV2_WDOGE_ETH, UniV2_YFI_ETH,
} = Assets;
const { Income, Expense, SwapIn, SwapOut, Deposit, Withdraw } = TransferCategories;
const source = TransactionSources.Uniswap;

////////////////////////////////////////
/// Addresses
//
const factoryAddresses = [
  { name: "UniswapFactoryV1", address: "0xc0a47dfe034b400b47bdad5fecda2621de6c4d95" },
  { name: "UniswapFactoryV2", address: "0x5c69bee701ef814a2b6a3edd4b1652cb9cc5aa6f" },
  { name: "UniswapFactoryV3", address: "0x1f98431c8ad98523631ae4a59f267346ea31f984" },
].map(row => ({ ...row, category: AddressCategories.Defi })) as AddressBookJson;

const routerAddresses = [
  { name: "UniswapRouterV2", address: "0x7a250d5630b4cf539739df2c5dacb4c659f2488d" },
  { name: "UniswapRouterV3", address: "0xe592427a0aece92de3edee1f18e0157c05861564" },
].map(row => ({ ...row, category: AddressCategories.Defi })) as AddressBookJson;

const govTokenAddresses = [
  { name: UNI, address: "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984" },
].map(row => ({ ...row, category: AddressCategories.ERC20 })) as AddressBookJson;

const airdropAddresses = [
  { name: "UNI-airdropper", address: "0x090d4613473dee047c3f2706764f49e0821d256e" },
].map(row => ({ ...row, category: AddressCategories.Defi })) as AddressBookJson;

const stakingAddresses = [
  { name: "Stake-ETH-USDC", address: "0x7fba4b8dc5e7616e59622806932dbea72537a56b" },
  { name: "Stake-ETH-USDT", address: "0x6c3e4cb2e96b01f4b866965a91ed4437839a121a" },
].map(row => ({ ...row, category: AddressCategories.Defi })) as AddressBookJson;

export const v1MarketAddresses = [
  { name: "UniV1-aDAI", address: "0x7cfab87aac0899c093235b342ac0e5b1acf159eb" },
  { name: "UniV1-AMPL", address: "0x042dbbdc27f75d277c3d99efe327db21bc4fde75" },
  { name: "UniV1-ANT", address: "0x077d52b047735976dfda76fef74d4d988ac25196" },
  { name: "UniV1-BAT", address: "0x2e642b8d59b45a1d8c5aef716a84ff44ea665914" },
  { name: "UniV1-cDAI", address: "0x34e89740adf97c3a9d3f63cc2ce4a914382c230b" },
  { name: "UniV1-cSAI", address: "0x45a2fdfed7f7a2c791fb1bdf6075b83fad821dde" },
  { name: "UniV1-DAI", address: "0x2a1530c4c41db0b0b2bb646cb5eb1a67b7158667" },
  { name: "UniV1-DGX", address: "0xb92de8b30584392af27726d5ce04ef3c4e5c9924" },
  { name: "UniV1-ENJ", address: "0xb99a23b1a4585fc56d0ec3b76528c27cad427473" },
  { name: "UniV1-FOAM", address: "0xf79cb3bea83bd502737586a6e8b133c378fd1ff2" },
  { name: "UniV1-GEN", address: "0x26cc0eab6cb650b0db4d0d0da8cb5bf69f4ad692" },
  { name: "UniV1-GNO", address: "0xe8e45431b93215566ba923a7e611b7342ea954df" },
  { name: "UniV1-HEX", address: "0x05cde89ccfa0ada8c88d5a23caaa79ef129e7883" },
  { name: "UniV1-imBTC", address: "0xffcf45b540e6c9f094ae656d2e34ad11cdfdb187" },
  { name: "UniV1-LINK", address: "0xf173214c720f58e03e194085b1db28b50acdeead" },
  { name: "UniV1-LOOM", address: "0x417cb32bc991fbbdcae230c7c4771cc0d69daa6b" },
  { name: "UniV1-LPT", address: "0xc4a1c45d5546029fd57128483ae65b56124bfa6a" },
  { name: "UniV1-LRC", address: "0xa539baaa3aca455c986bb1e25301cef936ce1b65" },
  { name: "UniV1-MANA", address: "0xc6581ce3a005e2801c1e0903281bbd318ec5b5c2" },
  { name: "UniV1-MKR", address: "0x2c4bd064b998838076fa341a83d007fc2fa50957" },
  { name: "UniV1-RDN", address: "0x7d03cecb36820b4666f45e1b4ca2538724db271c" },
  { name: "UniV1-REN", address: "0x43892992b0b102459e895b88601bb2c76736942c" },
  { name: "UniV1-REP", address: "0x48b04d2a05b6b604d8d5223fd1984f191ded51af" },
  { name: "UniV1-SAI", address: "0x09cabec1ead1c0ba254b09efb3ee13841712be14" },
  { name: "UniV1-sETH", address: "0xe9cf7887b93150d4f2da7dfc6d502b216438f244" },
  { name: "UniV1-SNT", address: "0x1aec8f11a7e78dc22477e91ed924fab46e3a88fd" },
  { name: "UniV1-SNX", address: "0x3958b4ec427f8fa24eb60f42821760e88d485f7f" },
  { name: "UniV1-SNXv1", address: "0x8da198a049426bfcf1522b0dc52f84beda6e38ff" },
  { name: "UniV1-SOCKS", address: "0x22d8432cc7aa4f8712a655fc4cdfb1baec29fca9" },
  { name: "UniV1-SPANK", address: "0x4e395304655f0796bc3bc63709db72173b9ddf98" },
  { name: "UniV1-sUSD", address: "0xb944d13b2f4047fc7bd3f7013bcf01b115fb260d" },
  { name: "UniV1-sUSDv1", address: "0xa1ecdcca26150cf69090280ee2ee32347c238c7b" },
  { name: "UniV1-TUSD", address: "0x5048b9d01097498fd72f3f14bc9bc74a5aac8fa7" },
  { name: "UniV1-UMA", address: "0x6264c8d158f32bd8c01b8a0102b57dfcfcfb8561" },
  { name: "UniV1-USDC", address: "0x97dec872013f6b5fb443861090ad931542878126" },
  { name: "UniV1-WBTC", address: "0x4d2f5cfba55ae412221182d8475bc85799a5644b" },
  { name: "UniV1-WETH", address: "0xa2881a90bf33f03e7a3f803765cd2ed5c8928dfb" },
  { name: "UniV1-ZRX", address: "0xae76c84c9262cdb9abc0c2c8888e62db8e22a0bf" },
].map(row => ({ ...row, category: AddressCategories.Defi })) as AddressBookJson;

export const v2MarketAddresses = [
  { name: UniV2_1INCH_ETH, address: "0x26aad2da94c59524ac0d93f6d6cbf9071d7086f2" },
  { name: UniV2_AAVE_ETH, address: "0xdfc14d2af169b0d36c4eff567ada9b2e0cae044f" },
  { name: UniV2_COMP_ETH, address: "0xcffdded873554f362ac02f8fb1f02e5ada10516f" },
  { name: UniV2_CREAM_ETH, address: "0xddf9b7a31b32ebaf5c064c80900046c9e5b7c65f" },
  { name: UniV2_DAI_ETH, address: "0xa478c2975ab1ea89e8196811f51a7b7ade33eb11" },
  { name: UniV2_DAI_USDC, address: "0xae461ca67b15dc8dc81ce7615e0320da1a9ab8d5" },
  { name: UniV2_DPI_ETH, address: "0x4d5ef58aac27d99935e5b6b4a6778ff292059991" },
  { name: UniV2_ESD_USDC, address: "0x88ff79eb2bc5850f27315415da8685282c7610f9" },
  { name: UniV2_ETH_AMPL, address: "0xc5be99a02c6857f9eac67bbce58df5572498f40c" },
  { name: UniV2_ETH_cDAI, address: "0x9896bd979f9da57857322cc15e154222c4658a5a" },
  { name: UniV2_ETH_CHERRY, address: "0x7b7a444e59851439a09426f4047c8cead7b3b6b9" },
  { name: UniV2_ETH_CRV, address: "0x3da1313ae46132a397d90d95b1424a9a7e3e0fce" },
  { name: UniV2_ETH_GEN, address: "0xf37ed742819ec006b0802df5c2b0e9132f22c625" },
  { name: UniV2_ETH_GRT, address: "0x2e81ec0b8b4022fac83a21b2f2b4b8f5ed744d70" },
  { name: UniV2_ETH_renBTC, address: "0x81fbef4704776cc5bba0a5df3a90056d2c6900b3" },
  { name: UniV2_ETH_TRU, address: "0x80b4d4e9d88d9f78198c56c5a27f3bacb9a685c5" },
  { name: UniV2_ETH_USDT, address: "0x0d4a11d5eeaac28ec3f61d100daf4d40471f1852" },
  { name: UniV2_ETH_ycrvUSD, address: "0x55df969467ebdf954fe33470ed9c3c0f8fab0816" },
  { name: UniV2_FEI_ETH, address: "0x94b0a3d511b6ecdb17ebf877278ab030acb0a878" },
  { name: UniV2_HEX_ETH, address: "0x55d5c232d921b9eaa6b37b5845e439acd04b4dba" },
  { name: UniV2_LINK_ETH, address: "0xa2107fa5b38d9bbd2c461d6edf11b11a50f6b974" },
  { name: UniV2_LRC_ETH, address: "0x8878df9e1a7c87dcbf6d3999d997f262c05d8c70" },
  { name: UniV2_LUSD_ETH, address: "0xf20ef17b889b437c151eb5ba15a47bfc62bff469" },
  { name: UniV2_MATIC_ETH, address: "0x819f3450da6f110ba6ea52195b3beafa246062de" },
  { name: UniV2_MKR_ETH, address: "0xc2adda861f89bbb333c90c492cb837741916a225" },
  { name: UniV2_PICKLE_ETH, address: "0xdc98556ce24f007a5ef6dc1ce96322d65832a819" },
  { name: UniV2_RAI_ETH, address: "0x8ae720a71622e824f576b4a8c03031066548a3b1" },
  { name: UniV2_REN_ETH, address: "0x8bd1661da98ebdd3bd080f0be4e6d9be8ce9858c" },
  { name: UniV2_SHIB_ETH, address: "0x811beed0119b4afce20d2583eb608c6f7af1954f" },
  { name: UniV2_SNX_ETH, address: "0x43ae24960e5534731fc831386c07755a2dc33d47" },
  { name: UniV2_sUSD_ETH, address: "0xf80758ab42c3b07da84053fd88804bcb6baa4b5c" },
  { name: UniV2_SUSHI_ETH, address: "0xce84867c3c02b05dc570d0135103d3fb9cc19433" },
  { name: UniV2_TORN_ETH, address: "0x0c722a487876989af8a05fffb6e32e45cc23fb3a" },
  { name: UniV2_UNI_ETH, address: "0xd3d2e2692501a5c9ca623199d38826e513033a17" },
  { name: UniV2_USDC_DSD, address: "0x66e33d2605c5fb25ebb7cd7528e7997b0afa55e8" },
  { name: UniV2_USDC_ETH, address: "0xb4e16d0168e52d35cacd2c6185b44281ec28c9dc" },
  { name: UniV2_USDC_GRT, address: "0xdfa42ba0130425b21a1568507b084cc246fb0c8f" },
  { name: UniV2_USDC_USDT, address: "0x3041cbd36888becc7bbcbc0045e3b1f144466f5f" },
  { name: UniV2_WBTC_ETH, address: "0xbb2b8038a1640196fbe3e38816f3e67cba72d940" },
  { name: UniV2_WBTC_USDC, address: "0x004375dff511095cc5a197a54140a24efef3a416" },
  { name: UniV2_WDOGE_ETH, address: "0xc3d7aa944105d3fafe07fc1822102449c916a8d0" },
  { name: UniV2_YFI_ETH, address: "0x2fdbadf3c4d5a8666bc06645b8358ab803996e28" },
].map(row => ({ ...row, category: AddressCategories.ERC20 })) as AddressBookJson;

export const uniswapAddresses = [
  ...airdropAddresses,
  ...factoryAddresses,
  ...govTokenAddresses,
  ...routerAddresses,
  ...stakingAddresses,
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

const stakingInterface = new Interface([
  "event RewardAdded(uint256 reward)",
  "event RewardPaid(address indexed user, uint256 reward)",
  "event Staked(address indexed user, uint256 amount)",
  "event Withdrawn(address indexed user, uint256 amount)",
]);

const airdropInterface = new Interface([
  "event Claimed(uint256 index, address account, uint256 amount)",
]);

////////////////////////////////////////
/// Parser

const abrv = str => str.substring(0, 8).toLowerCase(); // for abbreviating account labels

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
        && ([Expense, SwapOut] as TransferCategory[]).includes(transfer.category)
    );
    const swapsIn = tx.transfers.filter((transfer: Transfer): boolean =>
      isSelf(transfer.to)
        && uniswapAddresses.some(e => smeq(transfer.from, e.address))
        && ([Income, SwapIn] as TransferCategory[]).includes(transfer.category)
    );
    // SwapIn entries for assets that don't exist in swapsOut should come first
    const ofType = asset => swap => swap.asset === asset;
    swapsIn.sort((s1, s2) =>
      swapsOut.filter(ofType(s1.asset)).length - swapsOut.filter(ofType(s2.asset)).length
    );
    return { in: swapsIn, out: swapsOut };
  };

  for (const txLog of ethTx.logs.filter(
    l => uniswapAddresses.some(e => smeq(e.address, l.address))
  )) {
    const address = sm(txLog.address);
    const index = txLog.index || 1;
    tx.sources = rmDups([source, ...tx.sources]) as TransactionSources[];

    // Parse events
    let subsrc, event;
    if (v2MarketAddresses.some(e => smeq(e.address, address))) {
      subsrc = `${source}V2`;
      event = parseEvent(uniswapV2Interface, txLog);
    } else if (v1MarketAddresses.some(e => smeq(e.address, address))) {
      subsrc = `${source}V1`;
      event = parseEvent(uniswapV1Interface, txLog);
    } else if (stakingAddresses.some(e => smeq(e.address, address))) {
      subsrc = `${source}V2`;
      event = parseEvent(stakingInterface, txLog);
    } else if (airdropAddresses.some(e => smeq(e.address, address))) {
      subsrc = `${source}V2`;
      event = parseEvent(airdropInterface, txLog);
    } else {
      log.debug(`Skipping ${getName(address)} event`);
      continue;
    }

    ////////////////////////////////////////
    // Core Uniswap Interactions: swap, deposit liq, withdraw liq
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
      swaps.in.forEach(swap => {
        swap.category = SwapIn;
        swap.from = address;
      });
      swaps.out.forEach(swap => {
        swap.category = SwapOut;
        swap.to = address;
      });
      swaps.in.forEach(swap => { swap.index = swap.index || index; });
      swaps.out.forEach(swap => { swap.index = swap.index || index; });

      ////////////////////////////////////////
      // Swaps
      if (["Swap", "EthPurchase", "TokenPurchase"].includes(event.name)) {
        tx.description = `${getName(swaps.out[0].from)} swapped ${
          round(swaps.out[0].quantity)
        } ${swaps.out[0].asset}${swaps.out.length > 1 ? ", etc" : ""} for ${
          round(swaps.in[0].quantity)
        } ${swaps.in[0].asset}${swaps.in.length > 1 ? ", etc" : ""} via ${subsrc}`;

      ////////////////////////////////////////
      // Deposit Liquidity
      } else if (["Mint", "AddLiquidity"].includes(event.name)) {
        tx.description = `${getName(swaps.out[0].from)} deposited ${
          round(swaps.out[0].quantity)
        } ${swaps.out[0].asset} and ${
          round(swaps.out[1].quantity)
        } ${swaps.out[1].asset} into ${subsrc}`;

      ////////////////////////////////////////
      // Withdraw Liquidity
      } else if (["Burn", "RemoveLiquidity"].includes(event.name)) {
        tx.description = `${getName(swaps.out[0].from)} withdrew ${
          round(swaps.in[0].quantity)
        } ${swaps.in[0].asset} and ${
          round(swaps.in[1].quantity)
        } ${swaps.in[1].asset} from ${subsrc}`;

      } else {
        log.warn(`Missing ${event.name} swaps: in=${swaps.in.length} out=${swaps.out.length}`);
      }

    ////////////////////////////////////////
    // UNI Airdrop
    } else if (event.name === "Claimed") {
      const airdrop = tx.transfers.find((transfer: Transfer): boolean =>
        airdropAddresses.some(e => smeq(transfer.from, e.address))
        && transfer.asset === UNI
        && transfer.category === Income
      );
      tx.description = `${getName(airdrop.to)} received an airdrop of ${
        round(airdrop.quantity)
      } ${airdrop.asset} from ${subsrc}`;

    ////////////////////////////////////////
    // UNI Mining Pool Deposit
    } else if (event.name === "Staked") {
      const deposit = tx.transfers.find((transfer: Transfer): boolean =>
        isSelf(transfer.from)
          && stakingAddresses.some(e => smeq(transfer.to, e.address))
          && v2MarketAddresses.some(e => getName(e.address) === transfer.asset)
          && ([Expense, Deposit] as TransferCategory[]).includes(transfer.category)
      );
      if (!deposit) {
        log.warn(`${subsrc} ${event.name} couldn't find a deposit to ${address}`);
        continue;
      }
      log.info(`Parsing ${subsrc} ${event.name}`);
      const account = `${source}-${getName(address)}-${abrv(deposit.from)}`;
      deposit.category = Deposit;
      deposit.to = account;
      tx.description = `${getName(deposit.from)} deposited ${
        deposit.asset
      } into ${account}`;

    ////////////////////////////////////////
    // UNI Mining Pool Withdraw
    } else if (event.name === "Withdrawn") {
      const withdraw = tx.transfers.find((transfer: Transfer): boolean =>
        isSelf(transfer.to)
          && stakingAddresses.some(e => smeq(transfer.from, e.address))
          && v2MarketAddresses.some(e => getName(e.address) === transfer.asset)
          && ([Income, Withdraw] as TransferCategory[]).includes(transfer.category)
      );
      if (!withdraw) {
        log.warn(`${subsrc} ${event.name} couldn't find a withdraw from staking pool}`);
        continue;
      }
      log.info(`Parsing ${subsrc} ${event.name}`);
      const account = `${source}-${getName(address)}-${abrv(withdraw.to)}`;
      withdraw.category = Withdraw;
      withdraw.from = account;
      tx.description = `${getName(withdraw.to)} withdrew ${
        withdraw.asset
      } from ${account}`;

    } else {
      log.debug(`Skipping ${subsrc} ${event.name}`);
    }
  }

  // log.debug(tx, `Done parsing ${source}`);
  return tx;
};
