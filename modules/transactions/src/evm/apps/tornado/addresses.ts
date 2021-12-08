import { AddressCategories } from "../../../enums";
import { setAddressCategory } from "../../../utils";
import { Tokens } from "../../enums";

const relayer = "TornadoRelayer";

// vTORN is non-transferrable so is not a token
const miscAddresses = [
  { name: "vTORN-airdropper", address: "Ethereum/0x4e7b3769921c8dfbdb3d1b4c73558db079a180c7" },
  { name: "vTORN", address: "Ethereum/0x3efa30704d2b8bbac821307230376556cf8cc39e" },
].map(setAddressCategory(AddressCategories.Defi));

const govTokenAddresses = [
  { name: Tokens.TORN, address: "Ethereum/0x77777feddddffc19ff86db637967013e6c6a116c" },
].map(setAddressCategory(AddressCategories.Token));

export const mixerAddresses = [
  { name: "tornado-proxy", address: "Ethereum/0x905b63fff465b9ffbf41dea908ceb12478ec7601" }, // old
  { name: "tornado-proxy", address: "Ethereum/0x722122df12d4e14e13ac3b6895a86e84145b6967" }, // new
  { name: relayer, address: "Ethereum/0xb541fc07bc7619fd4062a54d96268525cbc6ffef" },
  { name: "tornado-dai-100", address: "Ethereum/0xd4b88df4d29f5cedd6857912842cff3b20c8cfa3" },
  { name: "tornado-dai-1000", address: "Ethereum/0xfd8610d20aa15b7b2e3be39b396a1bc3516c7144" },
  { name: "tornado-dai-10000", address: "Ethereum/0x07687e702b410fa43f4cb4af7fa097918ffd2730" },
  { name: "tornado-dai-100000", address: "Ethereum/0x23773e65ed146a459791799d01336db287f25334" },
  { name: "tornado-eth-01", address: "Ethereum/0x12d66f87a04a9e220743712ce6d9bb1b5616b8fc" },
  { name: "tornado-eth-1", address: "Ethereum/0x47ce0c6ed5b0ce3d3a51fdb1c52dc66a7c3c2936" },
  { name: "tornado-eth-10", address: "Ethereum/0x910cbd523d972eb0a6f4cae4618ad62622b39dbf" },
  { name: "tornado-eth-100", address: "Ethereum/0xa160cdab225685da1d56aa342ad8841c3b53f291" },
  { name: "tornado-mixer", address: "Ethereum/0x94a1b5cdb22c43faab4abeb5c74999895464ddaf" },
  { name: "tornado-wbtc-01", address: "Ethereum/0x178169b423a011fff22b9e3f3abea13414ddd0f1" },
  { name: "tornado-wbtc-1", address: "Ethereum/0x610b717796ad172b316836ac95a2ffad065ceab4" },
  { name: "tornado-wbtc-10", address: "Ethereum/0xbb93e510bbcd0b7beb5a853875f9ec60275cf498" },
].map(setAddressCategory(AddressCategories.Defi));

export const addresses = [
  ...govTokenAddresses,
  ...miscAddresses,
  ...mixerAddresses,
];
