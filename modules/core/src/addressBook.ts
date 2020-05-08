import {
  Address,
  AddressBook,
  AddressBookJson,
  AddressCategories,
  Logger,
} from "@finances/types";
import { ContextLogger } from "@finances/utils";
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
    { name: "genesis-protocol-1", address: "0x8940442e7f54e875c8c1c80213a4aee7eee4781c" },
    { name: "genesis-protocol-2", address: "0x374026a48d777cb0ffdccdb9a919c0aa7ce8a0fc" },
    { name: "genesis-protocol-3", address: "0x332b8c9734b4097de50f302f7d9f273ffdb45b84" },
    { name: "idle-dai", address: "0x10ec0d497824e342bcb0edce00959142aaa766dd" },
    { name: "mcd-dai-join", address: "0x9759a6ac90977b93b58547b4a71c78317f391a28" },
    { name: "mcd-gem-join", address: "0x2f0b23f53734252bda2277357e97e1517d6b042a" },
    { name: "mcd-sai-join", address: "0xad37fd42185ba63009177058208dd1be4b136e6b" },
    { name: "mcd-vat", address: "0x35d1b3f3d7966a1dfe207aa4514c12a259a0492b" },
    { name: "scd-gem-pit", address: "0x69076e44a9c70a67d5b79d95795aba299083c275" },
    { name: "scd-tub", address: "0x448a5065aebb8e423f0896e6c5d525c040f59af3" },
    { name: "spankbank", address: "0x1ecb60873e495ddfa2a13a8f4140e490dd574e6f" },
  ].map(row => ({ ...row, category: AddressCategories.Defi })) as AddressBookJson;

  const addressBook = userAddressBook.concat(defi, exchanges, tokens, cTokens);

  ////////////////////////////////////////
  // Internal Functions

  const sm = (str: string): string =>
    str.toLowerCase();

  const smeq = (str1: string, str2: string): boolean =>
    sm(str1) === sm(str2);

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
  // Exported Functions

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
    isCategory,
    isSelf,
    isToken,
  };
};
