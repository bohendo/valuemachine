import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import FormControl from "@material-ui/core/FormControl";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import Paper from "@material-ui/core/Paper";
import Select from "@material-ui/core/Select";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableContainer from "@material-ui/core/TableContainer";
import TableHead from "@material-ui/core/TableHead";
import TablePagination from "@material-ui/core/TablePagination";
import TableRow from "@material-ui/core/TableRow";
import Typography from "@material-ui/core/Typography";
import { Assets, EvmApps, TransactionSources } from "@valuemachine/transactions";
import {
  AddressBook,
  AddressCategories,
  Asset,
  Transaction,
  Transactions,
  TransactionsJson,
  TransactionSource,
} from "@valuemachine/types";
import React, { useEffect, useState } from "react";

import { TransactionRow } from "./TransactionRow";
import { DateInput } from "./DateInput";

const useStyles = makeStyles((theme: Theme) => createStyles({
  paper: {
    minWidth: "550px",
    padding: theme.spacing(2),
  },
  title: {
    margin: theme.spacing(2),
  },
  select: {
    margin: theme.spacing(3),
    minWidth: 160,
  },
  table: {
    maxWidth: "98%",
  },
}));

type TransactionTableProps = {
  addressBook: AddressBook;
  transactions: Transactions;
};
export const TransactionTable: React.FC<TransactionTableProps> = ({
  addressBook,
  transactions,
}: TransactionTableProps) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(25);
  const [filterAccount, setFilterAccount] = useState("");
  const [filterAsset, setFilterAsset] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [filterApp, setFilterApp] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filteredTxns, setFilteredTxns] = useState([] as TransactionsJson);
  const [ourAssets, setOurAssets] = useState([] as Asset[]);
  const classes = useStyles();

  const hasAccount = (account: string) => (tx: Transaction): boolean =>
    !account
    || tx.transfers.some(t => t.from.endsWith(account))
    || tx.transfers.some(t => t.to.endsWith(account));

  const hasAsset = (asset: Asset) => (tx: Transaction): boolean =>
    !asset || tx.transfers.some(t => t.asset === asset);

  const hasSource = (source: TransactionSource) => (tx: Transaction): boolean =>
    !source || (tx?.sources || []).includes(source);

  const hasApp = (app: string) => (tx: Transaction): boolean =>
    !app || (tx?.apps || []).includes(app);

  useEffect(() => {
    const getDate = (timestamp: string): string =>
      (new Date(timestamp)).toISOString().split("T")[0];
    setFilteredTxns(transactions?.json
      .filter(tx => !filterStartDate || getDate(tx.date) >= getDate(filterStartDate))
      .filter(tx => !filterEndDate || getDate(tx.date) <= getDate(filterEndDate))
      .filter(hasAsset(filterAsset))
      .filter(hasAccount(filterAccount))
      .filter(hasSource(filterSource))
      .filter(hasApp(filterApp))
      .sort((e1: Transaction, e2: Transaction) =>
        (e1.date > e2.date) ? -1 : (e1.date < e2.date) ? 1 : 0
      )
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    addressBook, transactions,
    filterAccount, filterApp, filterAsset, filterSource, filterStartDate, filterEndDate,
  ]);

  useEffect(() => {
    setPage(0);
  }, [transactions, addressBook]);

  useEffect(() => {
    if (!addressBook || !transactions) return;
    setOurAssets(
      Object.keys(Assets)
        // TODO: the following line crashes the page when txns are cleared
        .filter(asset => transactions?.json?.some(hasAsset(asset)))
    );
  }, [addressBook, transactions]);

  const changeFilterSource = (event: React.ChangeEvent<{ value: unknown }>) => {
    if (typeof event.target.value !== "string") return;
    setFilterSource(event.target.value);
  };

  const changeFilterApp = (event: React.ChangeEvent<{ value: unknown }>) => {
    if (typeof event.target.value !== "string") return;
    setFilterApp(event.target.value);
  };

  const changeFilterAccount = (event: React.ChangeEvent<{ value: unknown }>) => {
    if (typeof event.target.value !== "string") return;
    setFilterAccount(event.target.value);
  };

  const changeFilterAsset = (event: React.ChangeEvent<{ value: unknown }>) => {
    if (typeof event.target.value !== "string") return;
    setFilterAsset(event.target.value);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  return (
    <Paper className={classes.paper}>

      <TableContainer>

        <Typography align="center" variant="h4" className={classes.title} component="div">
          {filteredTxns.length === transactions?.json.length
            ? `${filteredTxns.length} Transaction${filteredTxns.length === 1 ? "" : "s"}`
            : `${filteredTxns.length} of ${transactions?.json?.length} Transactions`
          }
        </Typography>

        <FormControl className={classes.select}>
          <InputLabel id="select-filter-account">Filter Account</InputLabel>
          <Select
            labelId="select-filter-account"
            id="select-filter-account"
            value={filterAccount || ""}
            onChange={changeFilterAccount}
          >
            <MenuItem value={""}>-</MenuItem>
            {Object.values(addressBook?.json || [])
              .filter(account => account.category === AddressCategories.Self)
              // TODO: the following line crashes the page when txns are cleared
              // .filter(account => transactions?.some(hasAccount(account.address)))
              .map(account => (
                <MenuItem key={account.address} value={account.address}>{account.name}</MenuItem>
              ))
            };
          </Select>
        </FormControl>

        <FormControl className={classes.select}>
          <InputLabel id="select-filter-asset">Filter Asset</InputLabel>
          <Select
            labelId="select-filter-asset"
            id="select-filter-asset"
            value={filterAsset || ""}
            onChange={changeFilterAsset}
          >
            <MenuItem value={""}>-</MenuItem>
            {ourAssets.map(asset => (
              <MenuItem key={asset} value={asset}>{asset}</MenuItem>
            )) };
          </Select>
        </FormControl>

        <FormControl className={classes.select}>
          <InputLabel id="select-filter-source">Filter Source</InputLabel>
          <Select
            labelId="select-filter-source"
            id="select-filter-source"
            value={filterSource || ""}
            onChange={changeFilterSource}
          >
            <MenuItem value={""}>-</MenuItem>
            {Object.keys(TransactionSources)
              // TODO: the following line crashes the page when txns are cleared
              // .filter(source => transactions?.some(hasSource(source)))
              .map(source => (
                <MenuItem key={source} value={source}>{source}</MenuItem>
              ))
            };
          </Select>
        </FormControl>

        <FormControl className={classes.select}>
          <InputLabel id="select-filter-app">Filter App</InputLabel>
          <Select
            labelId="select-filter-app"
            id="select-filter-app"
            value={filterApp || ""}
            onChange={changeFilterApp}
          >
            <MenuItem value={""}>-</MenuItem>
            {Object.keys(EvmApps)
              // TODO: the following line crashes the page when txns are cleared
              // .filter(app => transactions?.some(hasApp(app)))
              .map(app => (
                <MenuItem key={app} value={app}>{app}</MenuItem>
              ))
            };
          </Select>
        </FormControl>

        <DateInput
          id="filter-end-date"
          label="Filter End Date"
          setDate={setFilterEndDate}
        />

        <DateInput
          id="filter-start-date"
          label="Filter Start Date"
          setDate={setFilterStartDate}
        />


        <Table size="small" className={classes.table}>
          <TableHead>
            <TableRow>
              <TableCell><strong> Date </strong></TableCell>
              <TableCell><strong> Description </strong></TableCell>
              <TableCell><strong> Hash </strong></TableCell>
              <TableCell><strong> Apps </strong></TableCell>
              <TableCell><strong> Sources </strong></TableCell>
              <TableCell><strong> Transfers </strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredTxns
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((tx: Transaction, i: number) => (
                <TransactionRow addressBook={addressBook} key={i} tx={tx} />
              ))
            }
          </TableBody>
        </Table>

        <TablePagination
          rowsPerPageOptions={[25, 50, 100, 250]}
          component="div"
          count={filteredTxns?.length || 0}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />

      </TableContainer>

    </Paper>
  );
};
