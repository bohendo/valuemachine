import React, { useState, useEffect } from 'react';

import {
  getAddressBook,
} from "@finances/core";
import {
  StoreKeys,
} from "@finances/types";

import {
  CssBaseline,
  Container,
  Theme,
  createStyles,
  makeStyles,
} from '@material-ui/core';
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
  const [profile, setProfile] = useState(store.load(StoreKeys.Profile) || { addressBook: [] });
  const [addressBook, setAddressBook] = useState({} as any);

  useEffect(() => {
    setAddressBook(getAddressBook(profile.addressBook));
  }, [profile]);

  return (
    <div className={classes.root}>
      <CssBaseline />
      <NavBar />
      <main className={classes.main}>
        <div className={classes.appBarSpacer} />
        <Container maxWidth="lg" className={classes.container}>
          <Switch>
            <Route exact path="/">
              <Dashboard addressBook={addressBook} />
            </Route>
            <Route exact path="/account">
              <AccountInfo addressBook={addressBook} profile={profile} setProfile={setProfile} />
            </Route>
          </Switch>
        </Container>
      </main>
    </div>
  );
}

export default App;
