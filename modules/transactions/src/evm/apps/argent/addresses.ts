import {
  AddressCategories,
} from "@valuemachine/types";
import {
  setAddressCategory,
} from "@valuemachine/utils";

// Find more manager addresses at https://github.com/argentlabs/argent-contracts/releases/tag/2.1

export const relayerAddresses = [
  { name: "ArgentRelayer", address: "Ethereum/0xdd5a1c148ca114af2f4ebc639ce21fed4730a608" },
  { name: "ArgentRelayer", address: "Ethereum/0x0385b3f162a0e001b60ecb84d3cb06199d78f666" },
  { name: "ArgentRelayer", address: "Ethereum/0xf27696c8bca7d54d696189085ae1283f59342fa6" },
].map(setAddressCategory(AddressCategories.Defi));

export const managerAddresses = [
  { name: "ArgentMakerManager", address: "Ethereum/0x7557f4199aa99e5396330bac3b7bdaa262cb1913" },
].map(setAddressCategory(AddressCategories.Defi));

export const addresses = [
  ...relayerAddresses,
  ...managerAddresses,
];
