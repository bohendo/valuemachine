import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import AppBar from "@material-ui/core/AppBar";
import FormControl from "@material-ui/core/FormControl";
import IconButton from "@material-ui/core/IconButton";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import Select from "@material-ui/core/Select";
import Toolbar from "@material-ui/core/Toolbar";
import Typography from "@material-ui/core/Typography";
import AccountIcon from "@material-ui/icons/RecentActors";
import HomeIcon from "@material-ui/icons/Home";
import PricesIcon from "@material-ui/icons/LocalOffer";
import TaxesIcon from "@material-ui/icons/AccountBalance";
import ValueMachineIcon from "@material-ui/icons/PlayCircleFilled";
import TransactionsIcon from "@material-ui/icons/Receipt";
import LightIcon from "@material-ui/icons/BrightnessHigh";
import DarkIcon from "@material-ui/icons/Brightness4";
import {
  Cryptocurrencies,
  FiatCurrencies,
} from "@valuemachine/transactions";
import {
  Asset
} from "@valuemachine/types";
import React from "react";
import { Link } from "react-router-dom";


const useStyles = makeStyles((theme: Theme) => createStyles({
  navButton: {
    marginLeft: theme.spacing(2),
  },
  units: {
    minWidth: "75px",
    marginLeft: theme.spacing(2),
    merginRight: theme.spacing(1),
    "& > *": {
      "& > svg": {
        color: "inherit", // carrot icon
      },
      "&::before": {
        borderColor: "inherit", // underline
      },
      color: "inherit", // label & selection text
    },
  },
  title: {
    flexGrow: 1,
  },
  toggle: {
    minWidth: "50px",
    marginLeft: theme.spacing(1),
  },
  toolbar: {
    overflow: "scroll",
  },
}));

type PropTypes = {
  unit: Asset;
  setUnit: (val: Asset) => void;
  theme: Asset;
  setTheme: (val: Asset) => void;
}
export const NavBar: React.FC<PropTypes> = ({
  unit,
  setUnit,
  theme,
  setTheme,
}: PropTypes) => {
  const classes = useStyles();

  const handleUnitChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    if (typeof event.target.value !== "string") return;
    setUnit(event.target.value);
  };

  const toggleTheme = () => {
    if (theme === "light") {
      setTheme("dark");
    } else {
      setTheme("light");
    }
  };

  return (
    <AppBar position="absolute">
      <Toolbar className={classes.toolbar}>
        <IconButton
          color="inherit"
          component={Link}
          edge="start"
          to={"/"}
        >
          <HomeIcon />
        </IconButton>

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
          to={"/prices"}
          className={classes.navButton}
          color="inherit"
        >
          <PricesIcon />
        </IconButton>

        <IconButton
          component={Link}
          edge="start"
          to={"/value-machine"}
          className={classes.navButton}
          color="inherit"
        >
          <ValueMachineIcon />
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
          to={"/address-book"}
          className={classes.navButton}
          color="inherit"
          aria-label="address-book"
        >
          <AccountIcon />
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

        <FormControl focused={false} className={classes.units}>
          <InputLabel id="select-unit-label">Units</InputLabel>
          <Select
            labelId="select-unit-label"
            id="select-unit"
            value={unit || ""}
            onChange={handleUnitChange}
          >
            {[Cryptocurrencies.ETH, Cryptocurrencies.BTC, ...Object.keys({ ...FiatCurrencies })]
              .map(asset => <MenuItem key={asset} value={asset}>{asset}</MenuItem>)
            }
          </Select>
        </FormControl>

        <IconButton
          className={classes.toggle}
          color="secondary"
          edge="start"
          onClick={toggleTheme}
        >
          {theme === "dark" ? <LightIcon /> : <DarkIcon />}
        </IconButton>

      </Toolbar>
    </AppBar>
  );
};
