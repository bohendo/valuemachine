import React, { useState, useEffect } from 'react';

import {
  Container,
  CssBaseline,
  Grid,
  Theme,
  Typography,
  createStyles,
  makeStyles,
} from '@material-ui/core';
import { Route, Switch } from "react-router-dom";

import { NavBar } from "./components/NavBar";
import { AccountInfo } from "./components/AccountInfo";
import { Dashboard } from "./components/Dashboard";

import chainData from './data/chain-data.json';

const useStyles = makeStyles((theme: Theme) => createStyles({
  root: {
    backgroundColor: "linen",
  },
  container: {
    paddingTop: theme.spacing(4),
    paddingBottom: theme.spacing(4),
  },
  main: {
    marginTop: "80px",
    height: "100vh",
    overflow: "auto",
  },
  title: {
    flexGrow: 1,
  },
}));

const App: React.FC = () => {
  const classes = useStyles();

  return (
    <div className={classes.root}>
      <Container maxWidth="lg" className={classes.container}>
        <NavBar />
        <main className={classes.main}>
          <Switch>
            <Route exact path="/">
              <Dashboard />
            </Route>
            <Route exact path="/account">
              <AccountInfo />
            </Route>
          </Switch>
        </main>
      </Container>
    </div>
  );
}

export default App;
