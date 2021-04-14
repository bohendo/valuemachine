import { emptyChainData, emptyProfile } from "@finances/types";
import React from "react";

export const AccountContext = React.createContext({
  profile: emptyProfile,
  chainData: emptyChainData,
});
