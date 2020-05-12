import {
  Address,
  AddressBook,
  AddressBookJson,
  AddressCategories,
  Logger,
} from "@finances/types";
import { ContextLogger, sm, smeq } from "@finances/utils";
import { getAddress } from "ethers/utils";

export const getAddressBook = (userAddressBook: AddressBookJson, logger?: Logger): AddressBook => {
  const log = new ContextLogger("AddressBook", logger);

  ////////////////////////////////////////
  // Hardcoded Public Addresses

  const cTokens = [
    { name: "cBAT", address: "0x6c8c6b02e7b2be14d4fa6022dfd6d75921d90e4e" },
    { name: "cDAI", address: "0x5d3a536e4d6dbd6114cc1ead35777bab948e3643" },
    { name: "cETH", address: "0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5" },
    { name: "cREP", address: "0x158079ee67fce2f58472a96584a73c7ab9ac95c1" },
    { name: "cSAI", address: "0xf5dce57282a584d2746faf1593d3121fcac444dc" },
    { name: "cUSD", address: "0x39aa39c021dfbae8fac545936693ac917d5e7563" },
    { name: "cWBTC", address: "0xc11b1268c1a384e55c48c2391d8d480264a3a7f4" },
    { name: "cZRX", address: "0xb3319f5d18bc0d84dd1b4825dcde5d5f7266d407" },
  ].map(row => ({ ...row, category: AddressCategories.CToken })) as AddressBookJson;

  const tokens = [
    { name: "BAT", address: "0x0d8775f648430679a709e98d2b0cb6250d2887ef" },
    { name: "DAI", address: "0x6b175474e89094c44da98b954eedeac495271d0f" },
    { name: "GEN", address: "0x543ff227f64aa17ea132bf9886cab5db55dcaddf" },
    { name: "MKR", address: "0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2" },
    { name: "REP", address: "0xe94327d07fc17907b4db788e5adf2ed424addff6" },
    { name: "SAI", address: "0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359" },
    { name: "SNT", address: "0x744d70fdbe2ba4cf95131626614a1763df805b9e" },
    { name: "WETH", address: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2" },
  ].map(row => ({ ...row, category: AddressCategories.Erc20 })) as AddressBookJson;

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
    { name: "tornado", address: "0xb541fc07bc7619fd4062a54d96268525cbc6ffef" },
    { name: "tornado-mixer", address: "0x94a1b5cdb22c43faab4abeb5c74999895464ddaf" },
    { name: "uniswap-cdai", address: "0x45a2fdfed7f7a2c791fb1bdf6075b83fad821dde" },
    { name: "uniswap-dai", address: "0x2a1530c4c41db0b0b2bb646cb5eb1a67b7158667" },
    { name: "uniswap-gen", address: "0x26cc0eab6cb650b0db4d0d0da8cb5bf69f4ad692" },
    { name: "uniswap-mkr", address: "0x2c4bd064b998838076fa341a83d007fc2fa50957" },
    { name: "uniswap-sai", address: "0x09cabec1ead1c0ba254b09efb3ee13841712be14" },
    { name: "uniswap-snx", address: "0x3958b4ec427f8fa24eb60f42821760e88d485f7f" },
  ].map(row => ({ ...row, category: AddressCategories.Exchange })) as AddressBookJson;

  const defi = [
    { name: "compound", address: "0x3fda67f7583380e67ef93072294a7fac882fd7e7" },
    { name: "compound", address: "0xf859a1ad94bcf445a406b892ef0d3082f4174088" },
    { name: "compound-comptroller", address: "0x3d9819210a31b4961b30ef54be2aed79b9c9cd3b" },
    { name: "connext-channel-manager", address: "0xdfa6edae2ec0cf1d4a60542422724a48195a5071" },
    { name: "dharma-lever", address: "0x9bd1428009681e1e3c8f58b50b724739807aa6c5" },
    { name: "idle-dai", address: "0x10ec0d497824e342bcb0edce00959142aaa766dd" },
    { name: "mcd-dai-join", address: "0x9759a6ac90977b93b58547b4a71c78317f391a28" },
    { name: "mcd-gem-join", address: "0x2f0b23f53734252bda2277357e97e1517d6b042a" },
    { name: "mcd-sai-join", address: "0xad37fd42185ba63009177058208dd1be4b136e6b" },
    { name: "mcd-vat", address: "0x35d1b3f3d7966a1dfe207aa4514c12a259a0492b" },
    { name: "scd-gem-pit", address: "0x69076e44a9c70a67d5b79d95795aba299083c275" },
    { name: "scd-tub", address: "0x448a5065aebb8e423f0896e6c5d525c040f59af3" },
    { name: "spankbank", address: "0x1ecb60873e495ddfa2a13a8f4140e490dd574e6f" },
  ].map(row => ({ ...row, category: AddressCategories.Defi })) as AddressBookJson;

  const external = [
    { name: "ENS", address: "0x314159265dd8dbb310642f98f50c066173c1259b" },
    { name: "ENS-registrar", address: "0xb22c1c159d12461ea124b0deb4b5b93020e6ad16" },
    { name: "status-username-registrar", address: "0xdb5ac1a559b02e12f29fc0ec0e37be8e046def49" },
    { name: "eternal-storage-proxy", address: "0x4aa42145aa6ebf72e164c9bbc74fbd3788045016" },
    { name: "escrowed-erc20-bouncer", address: "0x2e225cf684a48f1de8eba5c56f1715c6f6c6b518" },
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
    { name: "genesis-alpha", address: "0x294f999356ed03347c7a23bcbcf8d33fa41dc830" },
    { name: "genesis-alpha", address: "0xa3f5411cfc9eee0dd108bf0d07433b6dd99037f1" },
    { name: "genesis-protocol", address: "0x332b8c9734b4097de50f302f7d9f273ffdb45b84" },
    { name: "genesis-protocol", address: "0x374026a48d777cb0ffdccdb9a919c0aa7ce8a0fc" },
    { name: "genesis-protocol", address: "0x8940442e7f54e875c8c1c80213a4aee7eee4781c" },
    { name: "gitcoin-grants-dhack", address: "0x0ed985925bb42c6719d10dcd1cc02d8cf596c15b" },
    { name: "gitcoin-grants-ethersjs", address: "0x8ba1f109551bd432803012645ac136ddd64dba72" },
    { name: "gitcoin-grants-rdai", address: "0xa153b8891e77f1ae037026514c927530d877fab8" },
    { name: "gitcoin-grants-walletconnect", address: "0xcbec15583a21c3ddad5fab658be5b4fe85df730b" },
    { name: "gitcoin-maintainer", address: "0x00de4b13153673bcae2616b67bf822500d325fc3" },
    { name: "human-standard-token", address: "0x42d6622dece394b54999fbd73d108123806f6a18" },
    { name: "kickback", address: "0x80bf9ba97bc7a54fe70ef42d9c941b0574319d1d" },
    { name: "publicresolver", address: "0xd3ddccdd3b25a8a7423b5bee360a42146eb4baf3" },
    { name: "redeemer", address: "0x236e077f979f4ccb5f9a9e0163728fe2e743a56d" },
    { name: "redeemer", address: "0x67b13f159ca093325554aac6ee104fce36f3f9dd" },
    { name: "redeemer", address: "0x7f24e3bdc640dd1db413b9e1d68977653aeeda7e" },
    { name: "rep-from-token", address: "0x5c285b08b3c74c2b49d412e5be2230e286624e34" },
    { name: "rep-from-token", address: "0xfd908c16f6d1c731bfca05de3262e775d63d58d2" },
    { name: "reverseRegister", address: "0x9062c0a6dbd6108336bcbe4593a3d1ce05512069" },
    { name: "snt-giveaway", address: "0x3f167627de4d2108d2f30407af5890f5154313a7" },
    { name: "spankchain", address: "0xb5e658dccc93ca08c88e8bb89dfb4cae854e2d57" },
    { name: "thecyber", address: "0x0734d56da60852a03e2aafae8a36ffd8c12b32f1" },
    { name: "urbit-azimuth", address: "0x6ac07b7c4601b5ce11de8dfe6335b871c7c4dd4d" },
  ].map(row => ({ ...row, category: AddressCategories.Public })) as AddressBookJson;

  const addressBook = []
    .concat(defi, exchanges, external, tokens, cTokens, userAddressBook)
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
    } else if (!getAddress(row.address)) {
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
    isCategory(AddressCategories.Erc20)(address) || isCategory(AddressCategories.CToken)(address);

  const getName = (address: Address): string =>
    !address
      ? ""
      : addressBook.find(row => smeq(row.address, address))
      ? addressBook.find(row => smeq(row.address, address)).name
      : address.substring(0, 8);

  return {
    addresses,
    getName,
    json: userAddressBook,
    isCategory,
    isSelf,
    isToken,
  };
};
