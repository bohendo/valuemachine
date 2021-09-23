import {
  AddressCategories,
} from "@valuemachine/types";
import {
  setAddressCategory,
} from "@valuemachine/utils";

import { assets } from "./enums";

const factoryAddresses = [
  { name: "UniswapFactoryV1", address: "Ethereum/0xc0a47dfe034b400b47bdad5fecda2621de6c4d95" },
  { name: "UniswapFactoryV2", address: "Ethereum/0x5c69bee701ef814a2b6a3edd4b1652cb9cc5aa6f" },
  { name: "UniswapFactoryV3", address: "Ethereum/0x1f98431c8ad98523631ae4a59f267346ea31f984" },
].map(setAddressCategory(AddressCategories.Defi));

const govTokenAddresses = [
  { name: assets.UNI, address: "Ethereum/0x1f9840a85d5af5bf1d1762f925bdaddc4201f984" },
].map(setAddressCategory(AddressCategories.ERC20));

export const routerAddresses = [
  { name: "UniswapRouterV2", address: "Ethereum/0x7a250d5630b4cf539739df2c5dacb4c659f2488d" },
  { name: "UniswapRouterV3", address: "Ethereum/0xe592427a0aece92de3edee1f18e0157c05861564" },
].map(setAddressCategory(AddressCategories.Defi));

export const airdropAddresses = [
  { name: "UNI-airdropper", address: "Ethereum/0x090d4613473dee047c3f2706764f49e0821d256e" },
].map(setAddressCategory(AddressCategories.Defi));

export const stakingAddresses = [
  { name: "Stake-ETH-USDC", address: "Ethereum/0x7fba4b8dc5e7616e59622806932dbea72537a56b" },
  { name: "Stake-ETH-USDT", address: "Ethereum/0x6c3e4cb2e96b01f4b866965a91ed4437839a121a" },
].map(setAddressCategory(AddressCategories.Defi));

export const v1MarketAddresses = [
  { name: "UniV1-aDAI", address: "Ethereum/0x7cfab87aac0899c093235b342ac0e5b1acf159eb" },
  { name: "UniV1-AMPL", address: "Ethereum/0x042dbbdc27f75d277c3d99efe327db21bc4fde75" },
  { name: "UniV1-ANT", address: "Ethereum/0x077d52b047735976dfda76fef74d4d988ac25196" },
  { name: "UniV1-BAT", address: "Ethereum/0x2e642b8d59b45a1d8c5aef716a84ff44ea665914" },
  { name: "UniV1-cDAI", address: "Ethereum/0x34e89740adf97c3a9d3f63cc2ce4a914382c230b" },
  { name: "UniV1-cSAI", address: "Ethereum/0x45a2fdfed7f7a2c791fb1bdf6075b83fad821dde" },
  { name: "UniV1-DAI", address: "Ethereum/0x2a1530c4c41db0b0b2bb646cb5eb1a67b7158667" },
  { name: "UniV1-DGX", address: "Ethereum/0xb92de8b30584392af27726d5ce04ef3c4e5c9924" },
  { name: "UniV1-ENJ", address: "Ethereum/0xb99a23b1a4585fc56d0ec3b76528c27cad427473" },
  { name: "UniV1-FOAM", address: "Ethereum/0xf79cb3bea83bd502737586a6e8b133c378fd1ff2" },
  { name: "UniV1-GEN", address: "Ethereum/0x26cc0eab6cb650b0db4d0d0da8cb5bf69f4ad692" },
  { name: "UniV1-GNO", address: "Ethereum/0xe8e45431b93215566ba923a7e611b7342ea954df" },
  { name: "UniV1-HEX", address: "Ethereum/0x05cde89ccfa0ada8c88d5a23caaa79ef129e7883" },
  { name: "UniV1-imBTC", address: "Ethereum/0xffcf45b540e6c9f094ae656d2e34ad11cdfdb187" },
  { name: "UniV1-LINK", address: "Ethereum/0xf173214c720f58e03e194085b1db28b50acdeead" },
  { name: "UniV1-LOOM", address: "Ethereum/0x417cb32bc991fbbdcae230c7c4771cc0d69daa6b" },
  { name: "UniV1-LPT", address: "Ethereum/0xc4a1c45d5546029fd57128483ae65b56124bfa6a" },
  { name: "UniV1-LRC", address: "Ethereum/0xa539baaa3aca455c986bb1e25301cef936ce1b65" },
  { name: "UniV1-MANA", address: "Ethereum/0xc6581ce3a005e2801c1e0903281bbd318ec5b5c2" },
  { name: "UniV1-MKR", address: "Ethereum/0x2c4bd064b998838076fa341a83d007fc2fa50957" },
  { name: "UniV1-RDN", address: "Ethereum/0x7d03cecb36820b4666f45e1b4ca2538724db271c" },
  { name: "UniV1-REN", address: "Ethereum/0x43892992b0b102459e895b88601bb2c76736942c" },
  { name: "UniV1-REP", address: "Ethereum/0x48b04d2a05b6b604d8d5223fd1984f191ded51af" },
  { name: "UniV1-SAI", address: "Ethereum/0x09cabec1ead1c0ba254b09efb3ee13841712be14" },
  { name: "UniV1-sETH", address: "Ethereum/0xe9cf7887b93150d4f2da7dfc6d502b216438f244" },
  { name: "UniV1-SNT", address: "Ethereum/0x1aec8f11a7e78dc22477e91ed924fab46e3a88fd" },
  { name: "UniV1-SNX", address: "Ethereum/0x3958b4ec427f8fa24eb60f42821760e88d485f7f" },
  { name: "UniV1-SNX", address: "Ethereum/0x8da198a049426bfcf1522b0dc52f84beda6e38ff" },
  { name: "UniV1-SOCKS", address: "Ethereum/0x22d8432cc7aa4f8712a655fc4cdfb1baec29fca9" },
  { name: "UniV1-SPANK", address: "Ethereum/0x4e395304655f0796bc3bc63709db72173b9ddf98" },
  { name: "UniV1-sUSD", address: "Ethereum/0xb944d13b2f4047fc7bd3f7013bcf01b115fb260d" },
  { name: "UniV1-sUSD", address: "Ethereum/0xa1ecdcca26150cf69090280ee2ee32347c238c7b" },
  { name: "UniV1-TUSD", address: "Ethereum/0x5048b9d01097498fd72f3f14bc9bc74a5aac8fa7" },
  { name: "UniV1-UMA", address: "Ethereum/0x6264c8d158f32bd8c01b8a0102b57dfcfcfb8561" },
  { name: "UniV1-USDC", address: "Ethereum/0x97dec872013f6b5fb443861090ad931542878126" },
  { name: "UniV1-WBTC", address: "Ethereum/0x4d2f5cfba55ae412221182d8475bc85799a5644b" },
  { name: "UniV1-WETH", address: "Ethereum/0xa2881a90bf33f03e7a3f803765cd2ed5c8928dfb" },
  { name: "UniV1-ZRX", address: "Ethereum/0xae76c84c9262cdb9abc0c2c8888e62db8e22a0bf" },
].map(setAddressCategory(AddressCategories.Exchange));

export const v2MarketAddresses = [
  { name: assets.UniV2_1INCH_ETH, address: "Ethereum/0x26aad2da94c59524ac0d93f6d6cbf9071d7086f2" },
  { name: assets.UniV2_AAVE_ETH, address: "Ethereum/0xdfc14d2af169b0d36c4eff567ada9b2e0cae044f" },
  { name: assets.UniV2_COMP_ETH, address: "Ethereum/0xcffdded873554f362ac02f8fb1f02e5ada10516f" },
  { name: assets.UniV2_CREAM_ETH, address: "Ethereum/0xddf9b7a31b32ebaf5c064c80900046c9e5b7c65f" },
  { name: assets.UniV2_DAI_ETH, address: "Ethereum/0xa478c2975ab1ea89e8196811f51a7b7ade33eb11" },
  { name: assets.UniV2_DAI_USDC, address: "Ethereum/0xae461ca67b15dc8dc81ce7615e0320da1a9ab8d5" },
  { name: assets.UniV2_DPI_ETH, address: "Ethereum/0x4d5ef58aac27d99935e5b6b4a6778ff292059991" },
  { name: assets.UniV2_ESD_USDC, address: "Ethereum/0x88ff79eb2bc5850f27315415da8685282c7610f9" },
  { name: assets.UniV2_ETH_AMPL, address: "Ethereum/0xc5be99a02c6857f9eac67bbce58df5572498f40c" },
  { name: assets.UniV2_ETH_cDAI, address: "Ethereum/0x9896bd979f9da57857322cc15e154222c4658a5a" },
  { name: assets.UniV2_ETH_CHERRY, address: "Ethereum/0x7b7a444e59851439a09426f4047c8cead7b3b6b9" },
  { name: assets.UniV2_ETH_CRV, address: "Ethereum/0x3da1313ae46132a397d90d95b1424a9a7e3e0fce" },
  { name: assets.UniV2_ETH_GEN, address: "Ethereum/0xf37ed742819ec006b0802df5c2b0e9132f22c625" },
  { name: assets.UniV2_ETH_GRT, address: "Ethereum/0x2e81ec0b8b4022fac83a21b2f2b4b8f5ed744d70" },
  { name: assets.UniV2_ETH_renBTC, address: "Ethereum/0x81fbef4704776cc5bba0a5df3a90056d2c6900b3" },
  { name: assets.UniV2_ETH_TRU, address: "Ethereum/0x80b4d4e9d88d9f78198c56c5a27f3bacb9a685c5" },
  { name: assets.UniV2_ETH_USDT, address: "Ethereum/0x0d4a11d5eeaac28ec3f61d100daf4d40471f1852" },
  { name: assets.UniV2_ETH_ycrvUSD, address: "Ethereum/0x55df969467ebdf954fe33470ed9c3c0f8fab0816" },
  { name: assets.UniV2_FEI_ETH, address: "Ethereum/0x94b0a3d511b6ecdb17ebf877278ab030acb0a878" },
  { name: assets.UniV2_HEX_ETH, address: "Ethereum/0x55d5c232d921b9eaa6b37b5845e439acd04b4dba" },
  { name: assets.UniV2_LINK_ETH, address: "Ethereum/0xa2107fa5b38d9bbd2c461d6edf11b11a50f6b974" },
  { name: assets.UniV2_LRC_ETH, address: "Ethereum/0x8878df9e1a7c87dcbf6d3999d997f262c05d8c70" },
  { name: assets.UniV2_LUSD_ETH, address: "Ethereum/0xf20ef17b889b437c151eb5ba15a47bfc62bff469" },
  { name: assets.UniV2_MATIC_ETH, address: "Ethereum/0x819f3450da6f110ba6ea52195b3beafa246062de" },
  { name: assets.UniV2_MKR_ETH, address: "Ethereum/0xc2adda861f89bbb333c90c492cb837741916a225" },
  { name: assets.UniV2_PICKLE_ETH, address: "Ethereum/0xdc98556ce24f007a5ef6dc1ce96322d65832a819" },
  { name: assets.UniV2_RAI_ETH, address: "Ethereum/0x8ae720a71622e824f576b4a8c03031066548a3b1" },
  { name: assets.UniV2_REN_ETH, address: "Ethereum/0x8bd1661da98ebdd3bd080f0be4e6d9be8ce9858c" },
  { name: assets.UniV2_SHIB_ETH, address: "Ethereum/0x811beed0119b4afce20d2583eb608c6f7af1954f" },
  { name: assets.UniV2_SNX_ETH, address: "Ethereum/0x43ae24960e5534731fc831386c07755a2dc33d47" },
  { name: assets.UniV2_sUSD_ETH, address: "Ethereum/0xf80758ab42c3b07da84053fd88804bcb6baa4b5c" },
  { name: assets.UniV2_SUSHI_ETH, address: "Ethereum/0xce84867c3c02b05dc570d0135103d3fb9cc19433" },
  { name: assets.UniV2_TORN_ETH, address: "Ethereum/0x0c722a487876989af8a05fffb6e32e45cc23fb3a" },
  { name: assets.UniV2_UNI_ETH, address: "Ethereum/0xd3d2e2692501a5c9ca623199d38826e513033a17" },
  { name: assets.UniV2_USDC_DSD, address: "Ethereum/0x66e33d2605c5fb25ebb7cd7528e7997b0afa55e8" },
  { name: assets.UniV2_USDC_ETH, address: "Ethereum/0xb4e16d0168e52d35cacd2c6185b44281ec28c9dc" },
  { name: assets.UniV2_USDC_GRT, address: "Ethereum/0xdfa42ba0130425b21a1568507b084cc246fb0c8f" },
  { name: assets.UniV2_USDC_USDT, address: "Ethereum/0x3041cbd36888becc7bbcbc0045e3b1f144466f5f" },
  { name: assets.UniV2_WBTC_ETH, address: "Ethereum/0xbb2b8038a1640196fbe3e38816f3e67cba72d940" },
  { name: assets.UniV2_WBTC_USDC, address: "Ethereum/0x004375dff511095cc5a197a54140a24efef3a416" },
  { name: assets.UniV2_WBTC_USDT, address: "Ethereum/0x0DE0Fa91b6DbaB8c8503aAA2D1DFa91a192cB149" },
  { name: assets.UniV2_WDOGE_ETH, address: "Ethereum/0xc3d7aa944105d3fafe07fc1822102449c916a8d0" },
  { name: assets.UniV2_YFI_ETH, address: "Ethereum/0x2fdbadf3c4d5a8666bc06645b8358ab803996e28" },
].map(setAddressCategory(AddressCategories.ERC20));

export const v3MarketAddresses = [
  { name: "UniV3_005_DAI_ETH", address: "Ethereum/0x60594a405d53811d3BC4766596EFD80fd545A270" },
  { name: "UniV3_005_DAI_USDC", address: "Ethereum/0x6c6bc977e13df9b0de53b251522280bb72383700" },
  { name: "UniV3_005_DAI_USDT", address: "Ethereum/0x6f48eca74b38d2936b02ab603ff4e36a6c0e3a77" },
  { name: "UniV3_005_ETH_USDT", address: "Ethereum/0x11b815efB8f581194ae79006d24E0d814B7697F6" },
  { name: "UniV3_005_MATIC_USDT", address: "Ethereum/0x972f43Bb94B76B9e2D036553d818879860b6A114" },
  { name: "UniV3_005_RAI_DAI", address: "Ethereum/0xcb0c5d9d92f4f2f80cce7aa271a1e148c226e19d" },
  { name: "UniV3_005_RAI_USDC", address: "Ethereum/0xFA7D7A0858a45C1b3b7238522A0C0d123900c118" },
  { name: "UniV3_005_USDC_ETH", address: "Ethereum/0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640" },
  { name: "UniV3_005_USDC_USDT", address: "Ethereum/0x7858e59e0c01ea06df3af3d20ac7b0003275d4bf" },
  { name: "UniV3_005_WBTC_ETH", address: "Ethereum/0x4585fe77225b41b697c938b018e2ac67ac5a20c0" },
  { name: "UniV3_03_COMP_ETH", address: "Ethereum/0xea4ba4ce14fdd287f380b55419b1c5b6c3f22ab6" },
  { name: "UniV3_03_DAI_ETH", address: "Ethereum/0xC2e9F25Be6257c210d7Adf0D4Cd6E3E881ba25f8" },
  { name: "UniV3_03_ETH_MKR", address: "Ethereum/0xe8c6c9227491c0a8156a0106a0204d881bb7e531" },
  { name: "UniV3_03_ETH_USDC", address: "Ethereum/0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8" },
  { name: "UniV3_03_ETH_USDT", address: "Ethereum/0x4e68ccd3e89f51c3074ca5072bbac773960dfa36" },
  { name: "UniV3_03_ETH_WBTC", address: "Ethereum/0xcbcdf9626bc03e24f779434178a73a0b4bad62ed" },
  { name: "UniV3_03_LINK_ETH", address: "Ethereum/0xa6cc3c2531fdaa6ae1a3ca84c2855806728693e8" },
  { name: "UniV3_03_MATIC_ETH", address: "Ethereum/0x290a6a7460b308ee3f19023d2d00de604bcf5b42" },
  { name: "UniV3_03_UNI_ETH", address: "Ethereum/0x1d42064fc4beb5f8aaf85f4617ae8b3b5b8bd801" },
  { name: "UniV3_03_WBTC_USDC", address: "Ethereum/0x99ac8ca7087fa4a2a1fb6357269965a2014abc35" },
  { name: "UniV3_03_WBTC_USDT", address: "Ethereum/0x9db9e0e53058c89e5b94e29621a205198648425b" },
  { name: "UniV3_1_TORN_ETH", address: "Ethereum/0x97a5a0B2D7Ed3accb7FD6404A1f5CA29320905AF" },
].map(setAddressCategory(AddressCategories.Exchange));

export const addresses = [
  ...airdropAddresses,
  ...factoryAddresses,
  ...govTokenAddresses,
  ...routerAddresses,
  ...stakingAddresses,
  ...v1MarketAddresses,
  ...v2MarketAddresses,
  ...v3MarketAddresses,
];
