import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableContainer from "@material-ui/core/TableContainer";
import TableHead from "@material-ui/core/TableHead";
import TablePagination from "@material-ui/core/TablePagination";
import TableRow from "@material-ui/core/TableRow";
import Typography from "@material-ui/core/Typography";
import { Methods } from "@valuemachine/transactions";
import {
  Account,
  AddressBook,
  App,
  Asset,
  IncomingTransfers,
  OutgoingTransfers,
  Transaction,
  Transactions,
  TransactionsJson,
  Source,
  TransferCategories,
} from "@valuemachine/types";
import { dedup } from "@valuemachine/utils";
import React, { useEffect, useState } from "react";

import { DateInput, SelectOne } from "../utils";

import { TransactionRow } from "./TransactionRow";

const useStyles = makeStyles((theme: Theme) => createStyles({
  paper: {
    padding: theme.spacing(1),
  },
  title: {
    padding: theme.spacing(2),
  },
  dropdown: {
    margin: theme.spacing(3),
    minWidth: theme.spacing(20),
  },
  table: {
    minWidth: theme.spacing(115),
    overflow: "auto",
  },
  firstCell: {
    maxWidth: theme.spacing(16),
    padding: theme.spacing(1),
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
  const [filterApp, setFilterApp] = useState("");
  const [filterAsset, setFilterAsset] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterMethod, setFilterMethod] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filteredTxns, setFilteredTxns] = useState([] as TransactionsJson);
  const [ourAccounts, setOurAccounts] = useState([] as Account[]);
  const [ourApps, setOurApps] = useState([] as App[]);
  const [ourAssets, setOurAssets] = useState([] as Asset[]);
  const [ourSources, setOurSources] = useState([] as Source[]);
  const classes = useStyles();

  const hasAccount = (account: string) => (tx: Transaction): boolean =>
    !account
    || tx.transfers.some(t => t.from.endsWith(account))
    || tx.transfers.some(t => t.to.endsWith(account));

  const hasApp = (app: string) => (tx: Transaction): boolean =>
    !app || tx.apps.includes(app);

  const hasAsset = (asset: Asset) => (tx: Transaction): boolean =>
    !asset || tx.transfers.some(t => t.asset === asset);

  const hasSource = (source: Source) => (tx: Transaction): boolean =>
    !source || (tx?.sources || []).includes(source);

  const hasMethod = (method: string) => (tx: Transaction): boolean =>
    !method || tx?.method.includes(method);

  useEffect(() => {
    setPage(0);
    const getDate = (timestamp: string): string =>
      (new Date(timestamp)).toISOString().split("T")[0];
    setFilteredTxns(transactions?.json
      .filter(tx => !filterStartDate || getDate(tx.date) >= getDate(filterStartDate))
      .filter(tx => !filterEndDate || getDate(tx.date) <= getDate(filterEndDate))
      .filter(hasAsset(filterAsset))
      .filter(hasAccount(filterAccount))
      .filter(hasSource(filterSource))
      .filter(hasMethod(filterMethod))
      .filter(hasApp(filterApp))
      .sort((e1: Transaction, e2: Transaction) =>
        (e1.date > e2.date) ? -1 : (e1.date < e2.date) ? 1 : 0
      )
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    addressBook, transactions,
    filterAccount,
    filterApp,
    filterAsset,
    filterEndDate,
    filterMethod,
    filterSource,
    filterStartDate,
  ]);

  useEffect(() => {
    if (!addressBook || !transactions) return;
    setOurAccounts(
      dedup(transactions?.json.map(tx => tx.transfers.map(transfer => {
        if (transfer.category === TransferCategories.Internal) {
          return [transfer.to, transfer.from];
        } else if (Object.keys(OutgoingTransfers).includes(transfer.category)) {
          return [transfer.from];
        } else if (Object.keys(IncomingTransfers).includes(transfer.category)) {
          return [transfer.to];
        } else {
          return [];
        }
      }).flat()).flat()).sort()
    );
    setOurApps(
      dedup(transactions?.json.map(tx => tx.apps).flat()).sort()
    );
    setOurAssets(
      dedup(transactions?.json.map(tx => tx.transfers.map(t => t.asset)).flat()).sort()
    );
    setOurSources(
      dedup(transactions?.json.map(tx => tx.sources).flat()).sort()
    );
  }, [addressBook, transactions]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  return (
    <Paper className={classes.paper}>

      <Typography align="center" variant="h4" className={classes.title} component="div">
        {filteredTxns.length === transactions?.json.length
          ? `${filteredTxns.length} Transaction${filteredTxns.length === 1 ? "" : "s"}`
          : `${filteredTxns.length} of ${transactions?.json?.length} Transactions`
        }
      </Typography>

      <SelectOne
        label="Filter Account"
        choices={ourAccounts}
        selection={filterAccount}
        setSelection={setFilterAccount}
        toDisplay={val => addressBook.getName(val, true)}
      />

      <SelectOne
        label="Filter App"
        choices={ourApps}
        selection={filterApp}
        setSelection={setFilterApp}
      />

      <SelectOne
        label="Filter Asset"
        choices={ourAssets}
        selection={filterAsset}
        setSelection={setFilterAsset}
        toDisplay={val => addressBook.getName(val, true)}
      />

      <SelectOne
        label="Filter Method"
        choices={Object.keys(Methods)}
        selection={filterMethod}
        setSelection={setFilterMethod}
      />

      <SelectOne
        label="Filter Source"
        choices={ourSources}
        selection={filterSource}
        setSelection={setFilterSource}
      />

      <br/>

      <DateInput
        label="Filter End Date"
        setDate={setFilterEndDate}
      />

      <DateInput
        label="Filter Start Date"
        setDate={setFilterStartDate}
      />

      <br/>

      <TableContainer>
        <Table size="small" className={classes.table}>
          <TableHead>
            <TableRow>
              <TableCell className={classes.firstCell}><strong> Transfers </strong></TableCell>
              <TableCell><strong> Date </strong></TableCell>
              <TableCell><strong> Tx ID </strong></TableCell>
              <TableCell><strong> Sources </strong></TableCell>
              <TableCell><strong> Apps </strong></TableCell>
              <TableCell><strong> Description </strong></TableCell>
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
