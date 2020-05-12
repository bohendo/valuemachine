import React, { useState, useEffect } from 'react';

import {
  getAddressBook,
  getChainData,
} from "@finances/core";
import {
  AddressBook,
  ChainData,
  StoreKeys,
  emptyProfile,
} from "@finances/types";

import {
  CssBaseline,
  Container,
  Theme,
  createStyles,
  makeStyles,
} from '@material-ui/core';
import { Wallet } from "ethers";
import { Route, Switch } from "react-router-dom";

import { NavBar } from "./components/NavBar";
import { AccountInfo } from "./components/AccountInfo";
import { Dashboard } from "./components/Dashboard";

import { store } from "./utils/cache";

const useStyles = makeStyles((theme: Theme) => createStyles({
  appBarSpacer: theme.mixins.toolbar,
  root: {
    backgroundColor: "linen",
    display: 'flex',
  },
  container: {
    paddingTop: theme.spacing(4),
    paddingBottom: theme.spacing(4),
  },
  main: {
    flexGrow: 1,
    height: "100vh",
    overflow: "auto",
  },
}));

const App: React.FC = () => {
  const classes = useStyles();
  const [profile, setProfile] = useState(store.load(StoreKeys.Profile) || emptyProfile);
  const [addressBook, setAddressBook] = useState({} as AddressBook);
  const [chainData, setChainData] = useState({} as ChainData);
  const [signer, setSigner] = useState({} as Wallet);

  useEffect(() => {
    setAddressBook(getAddressBook(profile.addressBook));
  }, [profile]);

  useEffect(() => { 
    let signerKey = localStorage.getItem("signerKey");
    if (!signerKey) {
      signerKey = Wallet.createRandom().privateKey;
      localStorage.setItem("signerKey", signerKey);
    }
    setSigner(new Wallet(signerKey));

    // getChainData returns chain data access methods eg chainData.getAddressHistory
    setChainData(getChainData({
      etherscanKey: "etherscanKey",
      console,
      store,
    }));

  }, []);

  return (
    <div className={classes.root}>
      <CssBaseline />
      <NavBar />
      <main className={classes.main}>
        <div className={classes.appBarSpacer} />
        <Container maxWidth="lg" className={classes.container}>
          <Switch>
            <Route exact path="/">
              <Dashboard addressBook={addressBook} chainData={chainData} />
            </Route>
            <Route exact path="/account">
              <AccountInfo
                addressBook={addressBook}
                chainData={chainData}
                profile={profile}
                setChainData={setChainData}
                setProfile={setProfile}
                signer={signer}
              />
            </Route>
          </Switch>
        </Container>
      </main>
    </div>
  );
}

export default App;
