import {
  Address,
  AddressBook,
  AddressBookJson,
  AddressCategories,
  Logger,
} from "@finances/types";
import { getLogger, sm, smeq } from "@finances/utils";
import { utils } from "ethers";

export const getAddressBook = (
  userAddressBook: AddressBookJson = [],
  logger?: Logger,
): AddressBook => {
  const log = (logger || getLogger()).child({ module: "AddressBook" });

  ////////////////////////////////////////
  // Hardcoded Public Addresses

  const tokens = [
    { name: "BAT", address: "0x0d8775f648430679a709e98d2b0cb6250d2887ef" },
    { name: "CHERRY-old", address: "0x4ecb692b0fedecd7b486b4c99044392784877e8c" },
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
  ].map(row => ({ ...row, category: AddressCategories.Erc20 })) as AddressBookJson;

  // https://compound.finance/docs#networks
  const cTokens = [
    { name: "cBAT", address: "0x6c8c6b02e7b2be14d4fa6022dfd6d75921d90e4e" },
    { name: "cCOMP", address: "0x70e36f6bf80a52b3b46b3af8e106cc0ed743e8e4" },
    { name: "cDAI", address: "0x5d3a536e4d6dbd6114cc1ead35777bab948e3643" },
    { name: "cETH", address: "0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5" },
    { name: "cREP", address: "0x158079ee67fce2f58472a96584a73c7ab9ac95c1" },
    { name: "cSAI", address: "0xf5dce57282a584d2746faf1593d3121fcac444dc" },
    { name: "cUNI", address: "0x35a18000230da775cac24873d00ff85bccded550" },
    { name: "cUSDC", address: "0x39aa39c021dfbae8fac545936693ac917d5e7563" },
    { name: "cUSDT", address: "0xf650c3d88d12db855b8bf7d11be6c55a4e07dcc9" },
    { name: "cWBTC", address: "0xc11b1268c1a384e55c48c2391d8d480264a3a7f4" },
    { name: "cWBTCv2", address: "0xccf4429db6322d5c611ee964527d42e5d685dd6a" },
    { name: "cZRX", address: "0xb3319f5d18bc0d84dd1b4825dcde5d5f7266d407" },
  ].map(row => ({ ...row, category: AddressCategories.Compound })) as AddressBookJson;

  // https://docs.yearn.finance/developers/deployed-contracts-registry
  const yTokens = [
    { name: "yBUSDv3", address: "0x04bc0ab673d88ae9dbc9da2380cb6b79c4bca9ae" },
    { name: "yDAIv2", address: "0x16de59092dae5ccf4a1e6439d611fd0653f0bd01" },
    { name: "yDAIv3", address: "0xc2cb1040220768554cf699b0d863a3cd4324ce32" },
    { name: "ysUSDTv2", address: "0xf61718057901f84c4eec4339ef8f0d86d2b45600" },
    { name: "yTUSDv2", address: "0x73a052500105205d34daf004eab301916da8190f" },
    { name: "yUSDCv2", address: "0xd6ad7a6750a7593e092a9b218d66c0a814a3436e" },
    { name: "yUSDCv3", address: "0x26ea744e5b887e5205727f55dfbe8685e3b21951" },
    { name: "yUSDTv2", address: "0x83f798e925bcd4017eb265844fddabb448f1707d" },
    { name: "yUSDTv3", address: "0xe6354ed5bc4b393a5aad09f21c46e101e692d447" },
    { name: "yWBTCv2", address: "0x04aa51bbcb46541455ccf1b8bef2ebc5d3787ec9" },
  ].map(row => ({ ...row, category: AddressCategories.Yearn })) as AddressBookJson;

  const lpTokens = [
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
  ].map(row => ({ ...row, category: AddressCategories.Uniswap })) as AddressBookJson;

  // Addresses that we can swap into and swap out of
  const exchanges = [
    { name: "0x-v1", address: "0x12459c951127e0c374ff9105dda097662a027093" },
    { name: "0x-v2", address: "0x4f833a24e1f95d70f028921e27040ca56e09ab0b" },
    { name: "eth2dai", address: "0x39755357759ce0d7f32dc8dc45414cca409ae24e" },
    { name: "etherdelta", address: "0x8d12a197cb00d4747a1fe03395095ce2a5cc6819" },
    { name: "idex", address: "0x2a0c0dbecc7e4d658f48e01e3fa353f44050c208" },
    { name: "kyber-old", address: "0x9ae49c0d7f8f9ef4b864e004fe86ac8294e20950" },
    { name: "kyber-proxy", address: "0x818e6fecd516ecc3849daf6845e3ec868087b755" },
    { name: "oasis", address: "0x794e6e91555438afc3ccf1c5076a74f42133d08d" },
    { name: "oasis-old", address: "0x14fbca95be7e99c15cc2996c6c9d841e54b79425" },
    { name: "oasis-old", address: "0xb7ac09c2c0217b07d7c103029b4918a2c401eecb" },
    { name: "oasis-proxy", address: "0x793ebbe21607e4f04788f89c7a9b97320773ec59" },
    { name: "opensea", address: "0x7be8076f4ea4a4ad08075c2508e481d6c946d12b" },
    { name: "scd-mcd-migration", address: "0xc73e0383f3aff3215e6f04b0331d58cecf0ab849" },
    { name: "uniswap-router", address: "0x7a250d5630b4cf539739df2c5dacb4c659f2488d" },
    { name: "uniswap-v1-cdai", address: "0x45a2fdfed7f7a2c791fb1bdf6075b83fad821dde" },
    { name: "uniswap-v1-dai", address: "0x2a1530c4c41db0b0b2bb646cb5eb1a67b7158667" },
    { name: "uniswap-v1-gen", address: "0x26cc0eab6cb650b0db4d0d0da8cb5bf69f4ad692" },
    { name: "uniswap-v1-mkr", address: "0x2c4bd064b998838076fa341a83d007fc2fa50957" },
    { name: "uniswap-v1-sai", address: "0x09cabec1ead1c0ba254b09efb3ee13841712be14" },
    { name: "uniswap-v1-snx", address: "0x3958b4ec427f8fa24eb60f42821760e88d485f7f" },
    { name: "uniswap-v1-susd", address: "0xb944d13b2f4047fc7bd3f7013bcf01b115fb260d" },
  ].map(row => ({ ...row, category: AddressCategories.Exchange })) as AddressBookJson;

  // Addresses that we can deposit into/withdraw from
  const defi = [
    { name: "compound", address: "0x3fda67f7583380e67ef93072294a7fac882fd7e7" },
    { name: "compound", address: "0xf859a1ad94bcf445a406b892ef0d3082f4174088" },
    { name: "comptroller", address: "0x3d9819210a31b4961b30ef54be2aed79b9c9cd3b" },
    { name: "connext-channel-manager", address: "0xdfa6edae2ec0cf1d4a60542422724a48195a5071" },
    { name: "dharma-lever", address: "0x9bd1428009681e1e3c8f58b50b724739807aa6c5" },
    { name: "ens-controller", address: "0x283af0b28c62c092c9727f1ee09c02ca627eb7f5" },
    { name: "eth2-deposit", address: "0x00000000219ab540356cbb839cbe05303d7705fa" },
    { name: "genesis-protocol", address: "0x332b8c9734b4097de50f302f7d9f273ffdb45b84" },
    { name: "genesis-protocol", address: "0x374026a48d777cb0ffdccdb9a919c0aa7ce8a0fc" },
    { name: "genesis-protocol", address: "0x8940442e7f54e875c8c1c80213a4aee7eee4781c" },
    { name: "idle-dai", address: "0x10ec0d497824e342bcb0edce00959142aaa766dd" },
    { name: "kickback", address: "0x80bf9ba97bc7a54fe70ef42d9c941b0574319d1d" },
    { name: "mcd-dai-join", address: "0x9759a6ac90977b93b58547b4a71c78317f391a28" },
    { name: "mcd-gem-join", address: "0x2f0b23f53734252bda2277357e97e1517d6b042a" },
    { name: "mcd-sai-join", address: "0xad37fd42185ba63009177058208dd1be4b136e6b" },
    { name: "mcd-vat", address: "0x35d1b3f3d7966a1dfe207aa4514c12a259a0492b" },
    { name: "scd-gem-pit", address: "0x69076e44a9c70a67d5b79d95795aba299083c275" },
    { name: "scd-tub", address: "0x448a5065aebb8e423f0896e6c5d525c040f59af3" },
    { name: "spankbank", address: "0x1ecb60873e495ddfa2a13a8f4140e490dd574e6f" },
    { name: "tornado", address: "0xb541fc07bc7619fd4062a54d96268525cbc6ffef" },
    { name: "tornado-mixer", address: "0x94a1b5cdb22c43faab4abeb5c74999895464ddaf" },
    { name: "yDAI-vault", address: "0xacd43e627e64355f1861cec6d3a6688b31a6f952" },
    { name: "yGUSD-vault", address: "0xec0d8d3ed5477106c6d4ea27d90a60e594693c90" },
    { name: "yTUSD-vault", address: "0x37d19d1c4e1fa9dc47bd1ea12f742a0887eda74a" },
    { name: "yUSDC-vault", address: "0x597ad1e0c13bfe8025993d9e79c69e1c0233522e" },
    { name: "yUSDT-vault", address: "0x2f08119c6f07c006695e079aafc638b8789faf18" },
    { name: "yWETH-vault", address: "0xe1237aa7f535b0cc33fd973d66cbf830354d16c7" },
    { name: "yYFI-vault", address: "0xba2e7fed597fd0e3e70f5130bcdbbfe06bb94fe1" },
    { name: "tornado-dai-100", address: "0xd4b88df4d29f5cedd6857912842cff3b20c8cfa3" },
    { name: "tornado-dai-1000", address: "0xfd8610d20aa15b7b2e3be39b396a1bc3516c7144" },
    { name: "tornado-dai-10000", address: "0x07687e702b410fa43f4cb4af7fa097918ffd2730" },
    { name: "tornado-dai-100000", address: "0x23773e65ed146a459791799d01336db287f25334" },
    { name: "tornado-eth-01", address: "0x12d66f87a04a9e220743712ce6d9bb1b5616b8fc" },
    { name: "tornado-eth-1", address: "0x47ce0c6ed5b0ce3d3a51fdb1c52dc66a7c3c2936" },
    { name: "tornado-eth-10", address: "0x910cbd523d972eb0a6f4cae4618ad62622b39dbf" },
    { name: "tornado-eth-100", address: "0xa160cdab225685da1d56aa342ad8841c3b53f291" },
    { name: "tornado-wbtc-01", address: "0x178169b423a011fff22b9e3f3abea13414ddd0f1" },
    { name: "tornado-wbtc-1", address: "0x610b717796ad172b316836ac95a2ffad065ceab4" },
    { name: "tornado-wbtc-10", address: "0xbb93e510bbcd0b7beb5a853875f9ec60275cf498" },
    { name: "zk-money", address: "0x737901bea3eeb88459df9ef1be8ff3ae1b42a2ba" },
  ].map(row => ({ ...row, category: AddressCategories.Defi })) as AddressBookJson;

  // Addresses that we can transfer to/from
  const external = [
    { name: "ENS", address: "0x314159265dd8dbb310642f98f50c066173c1259b" },
    { name: "ENS-registrar", address: "0x57f1887a8bf19b14fc0df6fd9b2acc9af147ea85" },
    { name: "ENS-registrar", address: "0xb22c1c159d12461ea124b0deb4b5b93020e6ad16" },
    { name: "ENS-registrar-old", address: "0x6090a6e47849629b7245dfa1ca21d94cd15878ef" },
    { name: "airswap", address: "0x8fd3121013a07c57f0d69646e86e7a4880b467b7" },
    { name: "artifaqt", address: "0x34d565bddcff2dd74bc98e056ebd32dd5f5e1d34" },
    { name: "augur", address: "0x24e2b1d415e6e0d04042eaa45dc2a08fc33ca6cd" },
    { name: "augur", address: "0xd5524179cb7ae012f5b642c1d6d700bbaa76b96b" },
    { name: "base-registrar", address: "0xfac7bea255a6990f749363002136af6556b31e04" },
    { name: "bounties-network", address: "0x2af47a65da8cd66729b4209c22017d6a5c2d2400" },
    { name: "bounties-network", address: "0xe7f69ea2a79521136ee0bf3c50f6b5f1ea0ab0cd" },
    { name: "connext-daicard", address: "0x925488c7cd7e5eb3441885c6c1dfdbea875e08f7" },
    { name: "contribution-reward", address: "0x08cc7bba91b849156e9c44ded51896b38400f55b" },
    { name: "contribution-reward", address: "0x6646d0a32d6b9c1d1a7389a6b8da7e5fd780f316" },
    { name: "contribution-reward", address: "0xc282f494a0619592a2410166dcc749155804f548" },
    { name: "cryptokitty-auction", address: "0xb1690c08e213a35ed9bab7b318de14420fb57d8c" },
    { name: "cryptokitty-clockauction", address: "0xc7af99fe5513eb6710e6d5f44f9989da40f27f26" },
    { name: "cryptokitty-core", address: "0x06012c8cf97bead5deae237070f9587f8e7a266d" },
    { name: "daostack", address: "0x99bc239c208c7cf6c123c5fc1666383d17eace19" },
    { name: "dhack-eth-india", address: "0x0ed985925bb42c6719d10dcd1cc02d8cf596c15b" },
    { name: "escrowed-erc20-bouncer", address: "0x2e225cf684a48f1de8eba5c56f1715c6f6c6b518" },
    { name: "eternal-storage-proxy", address: "0x4aa42145aa6ebf72e164c9bbc74fbd3788045016" },
    { name: "genesis-alpha", address: "0x294f999356ed03347c7a23bcbcf8d33fa41dc830" },
    { name: "genesis-alpha", address: "0xa3f5411cfc9eee0dd108bf0d07433b6dd99037f1" },
    { name: "gitcoin", address: "0x00de4b13153673bcae2616b67bf822500d325fc3" },
    { name: "gitcoin", address: "0xdf869fad6db91f437b59f1edefab319493d4c4ce" },
    { name: "gitcoin-grant", address: "0x3e947a271a37ae7b59921c57be0a3246ee0d887c" },
    { name: "gitcoin-grant", address: "0x8ba1f109551bd432803012645ac136ddd64dba72" },
    { name: "gitcoin-grant", address: "0xa153b8891e77f1ae037026514c927530d877fab8" },
    { name: "gitcoin-grant", address: "0xcbec15583a21c3ddad5fab658be5b4fe85df730b" },
    { name: "human-standard-token", address: "0x42d6622dece394b54999fbd73d108123806f6a18" },
    { name: "maker-proxy-registry", address: "0x4678f0a6958e4d2bc4f1baf7bc52e8f3564f3fe4" },
    { name: "publicresolver", address: "0xd3ddccdd3b25a8a7423b5bee360a42146eb4baf3" },
    { name: "redeemer", address: "0x236e077f979f4ccb5f9a9e0163728fe2e743a56d" },
    { name: "redeemer", address: "0x67b13f159ca093325554aac6ee104fce36f3f9dd" },
    { name: "redeemer", address: "0x7f24e3bdc640dd1db413b9e1d68977653aeeda7e" },
    { name: "rep-from-token", address: "0x5c285b08b3c74c2b49d412e5be2230e286624e34" },
    { name: "rep-from-token", address: "0xfd908c16f6d1c731bfca05de3262e775d63d58d2" },
    { name: "reverseRegister", address: "0x9062c0a6dbd6108336bcbe4593a3d1ce05512069" },
    { name: "snt-giveaway", address: "0x3f167627de4d2108d2f30407af5890f5154313a7" },
    { name: "spankchain", address: "0xb5e658dccc93ca08c88e8bb89dfb4cae854e2d57" },
    { name: "status-username-registrar", address: "0xdb5ac1a559b02e12f29fc0ec0e37be8e046def49" },
    { name: "thecyber", address: "0x0734d56da60852a03e2aafae8a36ffd8c12b32f1" },
    { name: "uni-airdrop", address: "0x090d4613473dee047c3f2706764f49e0821d256e" },
    { name: "urbit-azimuth", address: "0x6ac07b7c4601b5ce11de8dfe6335b871c7c4dd4d" },
  ].map(row => ({ ...row, category: AddressCategories.Public })) as AddressBookJson;

  const addressBook = []
    .concat(defi, exchanges, external, tokens, cTokens, lpTokens, yTokens, userAddressBook)
    .filter(entry => !!entry);

  ////////////////////////////////////////
  // Internal Functions

  const isInnerCategory = (category: AddressCategories) => (address: Address): boolean =>
    address && addressBook
      .filter(row => smeq(row.category, category))
      .map(row => sm(row.address))
      .includes(sm(address));

  const isTagged = (tag: AddressCategories) => (address: Address): boolean =>
    address && addressBook
      .filter(row => row.tags && row.tags.includes(tag.toLowerCase()))
      .map(row => sm(row.address))
      .includes(sm(address));

  ////////////////////////////////////////
  // Init Code

  // Sanity check: it shouldn't have two entries for the same address
  let addresses = [];
  addressBook.forEach(row => {
    if (addresses.includes(sm(row.address))) {
      log.warn(`Address book has multiple entries for address ${row.address}`);
    } else if (!utils.getAddress(row.address)) {
      throw new Error(`Address book contains invalid address ${row.address}`);
    } else {
      addresses.push(sm(row.address));
    }
  });
  addresses = addresses.sort();

  log.info(`Address book containing ${addresses.length} addresses has been validated`);

  ////////////////////////////////////////
  // Exports

  const isCategory = (category: AddressCategories) => (address: Address): boolean =>
    isInnerCategory(category)(address) || isTagged(category)(address);

  const isSelf = isCategory(AddressCategories.Self);

  const isToken = (address: Address): boolean =>
    isCategory(AddressCategories.Erc20)(address)
      || isCategory(AddressCategories.Compound)(address)
      || isCategory(AddressCategories.Uniswap)(address)
      || isCategory(AddressCategories.Yearn)(address);

  const getName = (address: Address): string =>
    !address
      ? ""
      : addressBook.find(row => smeq(row.address, address))
        ? addressBook.find(row => smeq(row.address, address)).name
        : address.startsWith("0x")
          ? `${address.substring(0, 6)}..${address.substring(address.length - 4)}`
          : address;

  return {
    addresses,
    getName,
    json: userAddressBook,
    isCategory,
    isSelf,
    isToken,
  };
};
