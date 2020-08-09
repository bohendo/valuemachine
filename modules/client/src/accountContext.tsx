import React, { useState, useEffect } from 'react';
import { AddressBook, emptyProfile, ChainData } from "@finances/types";


export const AccountContext = React.createContext({
  profile: emptyProfile,
  setProfile: () => {}, //store.save(StoreKeys.Profile, value),
  addressBook: {} as AddressBook, //getAddressBook(this.profile.addressBook),
  chainData: {} as ChainData,
  setChainData: () => {},
});
