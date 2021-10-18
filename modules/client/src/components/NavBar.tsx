import AccountIcon from "@mui/icons-material/ManageAccounts";
import DarkIcon from "@mui/icons-material/Brightness4";
import LightIcon from "@mui/icons-material/BrightnessHigh";
import NetWorthIcon from "@mui/icons-material/PieChart";
import PricesIcon from "@mui/icons-material/LocalOffer";
import TaxesIcon from "@mui/icons-material/AccountBalance";
import TransactionsIcon from "@mui/icons-material/Receipt";
import ValueMachineIcon from "@mui/icons-material/PlayCircleFilled";
import AppBar from "@mui/material/AppBar";
import IconButton from "@mui/material/IconButton";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { SelectOne } from "@valuemachine/react";
import {
  Cryptocurrencies,
  FiatCurrencies,
} from "@valuemachine/transactions";
import {
  Asset
} from "@valuemachine/types";
import React from "react";
import { Link } from "react-router-dom";

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

  const toggleTheme = () => {
    if (theme === "light") {
      setTheme("dark");
    } else {
      setTheme("light");
    }
  };

  return (
    <AppBar position="absolute">
      <Toolbar sx={{ overflow: "auto" }}>

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
          sx={{ ml: 2 }}
          color="inherit"
          component={Link}
          edge="start"
          to={"/transactions"}
        >
          <TransactionsIcon />
        </IconButton>

        <IconButton
          sx={{ ml: 2 }}
          color="inherit"
          component={Link}
          edge="start"
          to={"/value-machine"}
        >
          <ValueMachineIcon />
        </IconButton>

        <IconButton
          sx={{ ml: 2 }}
          color="inherit"
          component={Link}
          edge="start"
          to={"/prices"}
        >
          <PricesIcon />
        </IconButton>

        <IconButton
          sx={{ ml: 2 }}
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
          sx={{ ml: 2 }}
          color="inherit"
        >
          <TaxesIcon />
        </IconButton>

        <Typography
          sx={{ flexGrow: 1 }}
          variant="h6"
          color="inherit"
          align={"center"}
          component="h1"
          noWrap
        >
          Value Machine
        </Typography>

        <SelectOne
          label="Units"
          choices={[Cryptocurrencies.ETH, Cryptocurrencies.BTC, ...Object.keys(FiatCurrencies)]}
          selection={unit}
          setSelection={setUnit}

        />

        <IconButton
          sx={{ ml: 1, minWidth: "4em" }}
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
