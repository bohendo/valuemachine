import React from "react";
import {
  AppBar,
  IconButton,
  Theme,
  Toolbar,
  Typography,
  createStyles,
  makeStyles,
} from "@material-ui/core";
import {
  Home as HomeIcon,
  RecentActors as AccountIcon,
  AccountBalance as TaxesIcon,
  Receipt as TransactionsIcon,
} from "@material-ui/icons";
import { Link } from "react-router-dom";

const useStyles = makeStyles((theme: Theme) => createStyles({
  homeButton: {
    marginRight: theme.spacing(2),
  },
  navButton: {
    marginLeft: theme.spacing(2),
  },
  title: {
    flexGrow: 1,
  },
}));

export const NavBar = () => {
  const classes = useStyles();
  return (
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
          to={"/taxes"}
          className={classes.navButton}
          color="inherit"
        >
          <TaxesIcon />
        </IconButton>

        <IconButton
          component={Link}
          edge="start"
          to={"/transactions"}
          className={classes.navButton}
          color="inherit"
        >
          <TransactionsIcon />
        </IconButton>

        <IconButton
          component={Link}
          edge="start"
          to={"/profile"}
          className={classes.navButton}
          color="inherit"
          aria-label="profile"
        >
          <AccountIcon />
        </IconButton>

      </Toolbar>
    </AppBar>
  );
};
