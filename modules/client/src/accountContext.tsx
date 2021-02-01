import React from 'react';
import { emptyProfile } from "@finances/types";


export const AccountContext = React.createContext({
  profile: emptyProfile,
});
