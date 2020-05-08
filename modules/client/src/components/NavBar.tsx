import React from 'react';

import {
  AppBar,
  CssBaseline,
  IconButton,
  Theme,
  Toolbar,
  Typography,
  createStyles,
  makeStyles,
} from '@material-ui/core';
import {
  Home as HomeIcon,
  AccountCircle as AccountIcon,
} from "@material-ui/icons";
import { Link } from "react-router-dom";

const useStyles = makeStyles((theme: Theme) => createStyles({
  grow: {
    borderBottom: `5px solid ${theme.palette.divider}`,
  },
  homeButton: {
    marginRight: theme.spacing(2),
  },
  accountButton: {
    marginLeft: theme.spacing(2),
  },
  title: {
    flexGrow: 1,
  },
}));

export const NavBar = () => {
  const classes = useStyles();
  return (
    <div className={classes.grow}>
      <CssBaseline />
      <AppBar position="absolute">
        <Toolbar>
          <IconButton
            component={Link}
            edge="start"
            to={"/"}
            color="inherit"
            className={classes.homeButton}
          >
            <HomeIcon />
          </IconButton>

          <Typography
            className={classes.title}
            variant="h6"
            color="inherit"
            align={"center"}
            component="h1"
            noWrap
          >
            Dashboard
          </Typography>

          <IconButton
            component={Link}
            edge="start"
            to={"/account"}
            className={classes.accountButton}
            color="inherit"
            aria-label="profile"
          >
            <AccountIcon />
          </IconButton>
        </Toolbar>
      </AppBar>
    </div>
  )
}
