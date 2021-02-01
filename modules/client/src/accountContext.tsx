import React from 'react';
import { Wallet } from "ethers";
import { AddressBook, emptyProfile, ChainData } from "@finances/types";


export const AccountContext = React.createContext({
  profile: emptyProfile,
});
