import React, { useState, useEffect } from 'react';

import {
  Container,
  Theme,
  createStyles,
  makeStyles,
} from '@material-ui/core';
import { Route, Switch } from "react-router-dom";

import { NavBar } from "./components/NavBar";
import { AccountInfo } from "./components/AccountInfo";
import { Dashboard } from "./components/Dashboard";

import * as cache from "./utils/cache";

const useStyles = makeStyles((theme: Theme) => createStyles({
  root: {
    backgroundColor: "linen",
  },
  container: {
    paddingTop: theme.spacing(4),
    paddingBottom: theme.spacing(4),
  },
  main: {
    marginTop: "50px",
    height: "100vh",
    overflow: "auto",
  },
  title: {
    flexGrow: 1,
  },
}));

const App: React.FC = () => {
  const classes = useStyles();
  const [personal, setPersonal] = useState(cache.loadPersonal());

  return (
    <div className={classes.root}>
      <NavBar />
      <main className={classes.main}>
        <Container maxWidth="lg" className={classes.container}>
          <Switch>
            <Route exact path="/">
              <Dashboard personal={personal} />
            </Route>
            <Route exact path="/account">
              <AccountInfo personal={personal} setPersonal={setPersonal} />
            </Route>
          </Switch>
        </Container>
      </main>
    </div>
  );
}

export default App;
