import { AddressCategories } from "../../../enums";
import { setAddressCategory } from "../../../utils";
import { Apps } from "../../enums";

const { CryptoKitties } = Apps;

const nfts = [{
  address: "Ethereum/0x06012c8cf97BEaD5deAe237070F9587f8E7A266d",
  name: CryptoKitties,
}].map(setAddressCategory(AddressCategories.NFT));

const markets = [{
  address: "Ethereum/0xb1690c08e213a35ed9bab7b318de14420fb57d8c",
  name: `${CryptoKitties}_SaleAuction`,
}, {
  address: "Ethereum/0xc7af99fe5513eb6710e6d5f44f9989da40f27f26",
  name: `${CryptoKitties}_SireAuction`,
}].map(setAddressCategory(AddressCategories.Public));

export const addresses = [
  ...nfts,
  ...markets,
];

export const coreAddress = addresses.find(e => e.name === CryptoKitties)!.address;
export const sireAuctionAddress = addresses.find(e =>
  e.name === `${CryptoKitties}_SireAuction`
)!.address;
export const saleAuctionAddress = addresses.find(e =>
  e.name === `${CryptoKitties}_SaleAuction`
)!.address;
