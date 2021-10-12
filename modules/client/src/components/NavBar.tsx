import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import AppBar from "@material-ui/core/AppBar";
import FormControl from "@material-ui/core/FormControl";
import IconButton from "@material-ui/core/IconButton";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import Select from "@material-ui/core/Select";
import Toolbar from "@material-ui/core/Toolbar";
import Typography from "@material-ui/core/Typography";
import AccountIcon from "@mui/icons-material/ManageAccounts";
import NetWorthIcon from "@material-ui/icons/PieChart";
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
  toolbar: {
    overflow: "auto",
  },
  navButton: {
    marginLeft: theme.spacing(2),
  },
  title: {
    flexGrow: theme.spacing(1),
  },
  selectUnit: {
    "& > *": {
      "& > svg": { color: "inherit" }, // carrot icon
      "&::before": { borderColor: "inherit" }, // underline
      color: "inherit", // label & selection text
    },
    marginLeft: theme.spacing(2),
    merginRight: theme.spacing(2),
    minWidth: theme.spacing(9),
  },
  lightswitch: {
    marginLeft: theme.spacing(1),
    minWidth: theme.spacing(7),
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
          aria-label="address-book"
          color="inherit"
          component={Link}
          edge="start"
          to={""}
        >
          <AccountIcon fontSize="large" />
        </IconButton>

        <IconButton
          className={classes.navButton}
          color="inherit"
          component={Link}
          edge="start"
          to={"/transactions"}
        >
          <TransactionsIcon />
        </IconButton>

        <IconButton
          className={classes.navButton}
          color="inherit"
          component={Link}
          edge="start"
          to={"/value-machine"}
        >
          <ValueMachineIcon />
        </IconButton>

        <IconButton
          className={classes.navButton}
          color="inherit"
          component={Link}
          edge="start"
          to={"/prices"}
        >
          <PricesIcon />
        </IconButton>

        <IconButton
          className={classes.navButton}
          color="inherit"
          component={Link}
          edge="start"
          to={"/net-worth"}
        >
          <NetWorthIcon />
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

        <Typography
          className={classes.title}
          variant="h6"
          color="inherit"
          align={"center"}
          component="h1"
          noWrap
        >
          Value Machine
        </Typography>

        <FormControl focused={false} className={classes.selectUnit}>
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
          className={classes.lightswitch}
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
