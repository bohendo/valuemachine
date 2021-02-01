import React, { useState } from 'react';

import {
  StoreKeys,
  emptyProfile,
} from "@finances/types";

import {
  Container,
  CssBaseline,
  Theme,
  ThemeProvider,
  createMuiTheme,
  createStyles,
  makeStyles,
} from '@material-ui/core';
import { Route, Switch } from "react-router-dom";

import { NavBar } from "./components/NavBar";
import { AccountInfo } from "./components/AccountInfo";
import { Dashboard } from "./components/Dashboard";

import { AccountContext } from "./accountContext";
import { store } from "./utils/cache";

const darkTheme = createMuiTheme({
  palette: {
    primary: {
      main: "#deaa56",
    },
    secondary: {
      main: "#e699a6",
    },
    type: "dark",
  },
});

const useStyles = makeStyles((theme: Theme) => createStyles({
  appBarSpacer: theme.mixins.toolbar,
  container: {
    paddingTop: theme.spacing(4),
    paddingBottom: theme.spacing(4),
  },
  main: {
    flexGrow: 1,
    overflow: "auto",
  },
}));

const App: React.FC = () => {
  const classes = useStyles();

  const [profile, setProfile] = useState(store.load(StoreKeys.Profile) || emptyProfile);

  const saveProfile = () => store.save(StoreKeys.Profile, profile);

  return (
    <ThemeProvider theme={darkTheme}>
      <AccountContext.Provider value={{profile}}>
        <CssBaseline />
        <NavBar />
        <main className={classes.main}>
          <div className={classes.appBarSpacer} />
          <Container maxWidth="lg" className={classes.container}>
            <Switch>
              <Route exact path="/">
                <Dashboard />
              </Route>
              <Route exact path="/account">
                <AccountInfo saveProfile={saveProfile} setProfile={setProfile} />
              </Route>
            </Switch>
          </Container>
        </main>
      </AccountContext.Provider>
    </ThemeProvider>
  );
};

export default App;
