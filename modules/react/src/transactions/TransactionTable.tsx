import Paper from "@mui/material/Paper";
import Grid from "@mui/material/Grid";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { Methods } from "@valuemachine/transactions";
import {
  Account,
  AddressBook,
  App,
  Asset,
  IncomingTransfers,
  OutgoingTransfers,
  Source,
  Transaction,
  Transactions,
  TransactionsJson,
  TransferCategories,
  TxId,
  TxTags,
} from "@valuemachine/types";
import { chrono, dedup } from "@valuemachine/utils";
import React, { useEffect, useState } from "react";

import { DateInput, Paginate, SelectOne } from "../utils";

import { TransactionRow } from "./TransactionRow";

type TransactionTableProps = {
  addressBook: AddressBook;
  setTransactions?: (val: TransactionsJson) => void;
  transactions: Transactions;
  txTags?: TxTags;
};
export const TransactionTable: React.FC<TransactionTableProps> = ({
  addressBook,
  setTransactions,
  transactions,
  txTags,
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
      ) || []
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

  const editTx = (uuid: TxId, newTx?: Transaction) => {
    if (!setTransactions || !transactions?.json) return;
    const newTxns = [...transactions.json];
    const oldTxIndex = newTxns.findIndex(tx => tx.uuid === uuid);
    if (oldTxIndex >= 0) {
      console.log(`Removing old tx at index ${oldTxIndex}`);
      newTxns.splice(oldTxIndex, 1);
    }
    if (newTx) {
      newTxns.push(newTx);
    }
    newTxns.sort(chrono);
    newTxns.forEach((tx, i) => { tx.index = i; });
    setTransactions(newTxns);
  };

  return (<>
    <Paper sx={{ p: 2 }}>

      <Grid container>
        <Grid item xs={12}>
          <Typography align="center" variant="h4" sx={{ p: 2 }} component="div">
            {filteredTxns.length === transactions?.json.length
              ? `${filteredTxns.length} Transaction${filteredTxns.length === 1 ? "" : "s"}`
              : `${filteredTxns.length} of ${transactions?.json?.length} Transactions`
            }
          </Typography>
        </Grid>

        <Grid item>
          <SelectOne
            label="Filter Account"
            choices={ourAccounts}
            selection={filterAccount}
            setSelection={setFilterAccount}
            toDisplay={val => addressBook?.getName(val, true) || val}
          />
        </Grid>

        <Grid item>
          <SelectOne
            label="Filter App"
            choices={ourApps}
            selection={filterApp}
            setSelection={setFilterApp}
          />
        </Grid>

        <Grid item>
          <SelectOne
            label="Filter Asset"
            choices={ourAssets}
            selection={filterAsset}
            setSelection={setFilterAsset}
            toDisplay={val => addressBook?.getName(val, true) || val}
          />
        </Grid>

        <Grid item>
          <SelectOne
            label="Filter Method"
            choices={Object.keys(Methods).sort()}
            selection={filterMethod}
            setSelection={setFilterMethod}
          />
        </Grid>

        <Grid item>
          <SelectOne
            label="Filter Source"
            choices={ourSources}
            selection={filterSource}
            setSelection={setFilterSource}
          />
        </Grid>
      </Grid>

      <Grid container>
        <Grid item>
          <DateInput
            label="Filter End Date"
            setDate={setFilterEndDate}
          />
        </Grid>

        <Grid item>
          <DateInput
            label="Filter Start Date"
            setDate={setFilterStartDate}
          />
        </Grid>
      </Grid>

      <br/>

      <TableContainer>
        <Table size="small" sx={{ minWidth: "68em", overflow: "auto" }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ p: 1, maxWidth: "5em" }}><strong> Transfers </strong></TableCell>
              <TableCell><strong> Date </strong></TableCell>
              <TableCell><strong> Tx ID </strong></TableCell>
              <TableCell><strong> Sources </strong></TableCell>
              <TableCell><strong> Apps </strong></TableCell>
              <TableCell><strong> Description </strong></TableCell>
              {setTransactions ? <TableCell><strong> Edit </strong></TableCell> : null}
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredTxns
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((tx: Transaction, i: number) => (<TransactionRow
                key={i}
                addressBook={addressBook}
                editTx={setTransactions ? editTx : undefined}
                tx={tx}
                txTags={txTags}
              />))
            }
          </TableBody>
          <Paginate
            count={filteredTxns?.length || 0}
            rowsPerPage={rowsPerPage}
            page={page}
            setPage={setPage}
            setRowsPerPage={setRowsPerPage}
          />
        </Table>
      </TableContainer>

    </Paper>

  </>);
};
