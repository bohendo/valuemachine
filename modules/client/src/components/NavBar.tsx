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
import { Prices, PricesJson } from "@valuemachine/prices";
import {
  SelectOne,
  SyncEverything,
//   syncTaxRows,
} from "@valuemachine/react";
import {
  Cryptocurrencies,
  FiatCurrencies,
} from "@valuemachine/transactions";
import {
  AddressBook,
  Asset,
  CsvFiles,
  TaxRows,
  TransactionsJson,
  TxTags,
  ValueMachine,
  ValueMachineJson,
} from "@valuemachine/types";
import React/*, { useEffect }*/ from "react";
import { Link } from "react-router-dom";

type PropTypes = {
  addressBook: AddressBook;
  csvFiles: CsvFiles;
  customTxns: TransactionsJson;
  syncMsg: string;
  setSyncMsg: (val: string) => void;
  prices: Prices;
  setPricesJson: (val: PricesJson) => void;
  setTaxRows: (val: TaxRows) => void;
  setTheme: (val: Asset) => void;
  setTransactionsJson: (val: TransactionsJson) => void;
  setUnit: (val: Asset) => void;
  setVMJson: (val: ValueMachineJson) => void;
  theme: Asset;
  txTags: TxTags;
  unit: Asset;
  vm: ValueMachine;
}
export const NavBar: React.FC<PropTypes> = ({
  addressBook,
  csvFiles,
  customTxns,
  prices,
  syncMsg,
  setSyncMsg,
  setPricesJson,
  setTaxRows,
  setTheme,
  setTransactionsJson,
  setUnit,
  setVMJson,
  theme,
  txTags,
  unit,
  vm,
}: PropTypes) => {

  const toggleTheme = () => {
    if (theme === "light") {
      setTheme("dark");
    } else {
      setTheme("light");
    }
  };

  /*
  useEffect(() => {(async () => {
    if (syncMsg) return; // abort if already syncing
    if (!txTags || !unit) return;
    await syncTaxRows({
      addressBook,
      prices,
      setSyncMsg,
      setTaxRows,
      txTags,
      unit,
      vm,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  })();}, [txTags, unit]);
  */

  return (
    <AppBar position="static" elevation={0} enableColorOnDark>
      <Toolbar variant="dense" sx={{ overflow: "auto" }}>

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
          {" "}
        </Typography>

        <SyncEverything
          addressBook={addressBook}
          csvFiles={csvFiles}
          customTxns={customTxns}
          prices={prices}
          setPricesJson={setPricesJson}
          setSyncMsg={setSyncMsg}
          setTaxRows={setTaxRows}
          setTransactionsJson={setTransactionsJson}
          setVMJson={setVMJson}
          syncMsg={syncMsg}
          txTags={txTags}
          unit={unit}
          vm={vm}
        />

        <SelectOne
          label="Units"
          choices={[Cryptocurrencies.ETH, Cryptocurrencies.BTC, ...Object.keys(FiatCurrencies)]}
          selection={unit}
          setSelection={setUnit}
          sx={{ p: 1 }}
        />

        <IconButton
          sx={{ ml: 1, minWidth: "2em" }}
          color="inherit"
          edge="start"
          onClick={toggleTheme}
        >
          {theme === "dark" ? <LightIcon /> : <DarkIcon />}
        </IconButton>

      </Toolbar>
    </AppBar>
  );
};
