import React from 'react';
import { Wallet } from "ethers";
import { AddressBook, emptyProfile, ChainData } from "@finances/types";


export const AccountContext = React.createContext({
  profile: emptyProfile,
  signer: {} as Wallet,
  setProfile: () => {}, //store.save(StoreKeys.Profile, value),
  addressBook: {} as AddressBook, //getAddressBook(this.profile.addressBook),
  chainData: {} as ChainData,
  setChainData: () => {},
});
