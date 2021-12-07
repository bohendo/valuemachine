import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import {
  ErrorEvent,
  Event,
  EventErrorCodes,
  EventTypes,
  GuardChangeEvent,
  HydratedEvent,
  TradeEvent,
  ValueMachine,
} from "@valuemachine/core";
import {
  Account,
  AddressBook,
  TxTags,
} from "@valuemachine/types";
import React, { useEffect, useState } from "react";

import { DateInput, Paginate, SelectOne } from "../utils";

import { EventRow } from "./EventRow";

type EventTableProps = {
  addressBook?: AddressBook;
  vm?: ValueMachine;
  txTags?: TxTags;
  setTxTags?: (val: TxTags) => void;
};
export const EventTable: React.FC<EventTableProps> = ({
  addressBook,
  vm,
  txTags,
  setTxTags,
}: EventTableProps) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(25);
  const [accounts, setAccounts] = useState([] as Account[]);
  const [filterAccount, setFilterAccount] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterCode, setFilterCode] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filteredEvents, setFilteredEvents] = useState([] as HydratedEvent[]);

  useEffect(() => {
    setAccounts(vm?.getAccounts() || []);
  }, [addressBook, vm]);

  useEffect(() => {
    setPage(0);
    setFilteredEvents(vm?.json?.events?.filter(event => (
      !filterAccount || (
        (event as GuardChangeEvent).to?.endsWith(filterAccount) ||
        (event as GuardChangeEvent).from?.endsWith(filterAccount) ||
        (event as TradeEvent).account?.endsWith(filterAccount)
      )
    ) && (
      !filterCode || (event as ErrorEvent)?.code === filterCode
    ) && (
      !filterDate || event.date.startsWith(filterDate)
    ) && (
      !filterType || event.type === filterType
    )).sort((e1: Event, e2: Event) =>
      // Sort by date, newest first
      (e1.date > e2.date) ? -1
      : (e1.date < e2.date) ? 1
      : 0
    ).map((e: Event) => vm?.getEvent(e.index)) || []);
  }, [vm, filterAccount, filterCode, filterDate, filterType]);

  useEffect(() => {
    if (filterType !== EventTypes.Error) setFilterCode("");
  }, [filterType]);

  return (
    <Paper sx={{ p: 2 }}>
      <Grid container>
        <Grid item xs={12}>
          <Typography align="center" variant="h4" sx={{ p: 2 }} component="div">
            {filteredEvents.length === vm?.json?.events?.length
              ? `${filteredEvents.length} Events`
              : `${filteredEvents.length} of ${vm?.json?.events?.length || 0} Events`
            }
          </Typography>
        </Grid>

        <Grid item>
          <DateInput
            label="Filter Date"
            date={filterDate}
            setDate={setFilterDate}
          />
        </Grid>

        <Grid item>
          <SelectOne
            label="Filter Account"
            choices={accounts.sort()}
            selection={filterAccount}
            setSelection={setFilterAccount}
            toDisplay={val => addressBook?.getName(val, true) || val}
          />
        </Grid>

        <Grid item>
          <SelectOne
            label="Filter Type"
            choices={Object.keys(EventTypes)}
            selection={filterType}
            setSelection={setFilterType}
          />
        </Grid>

        {filterType === EventTypes.Error ?
          <Grid item>
            <SelectOne
              label="Filter Error Code"
              choices={Object.keys(EventErrorCodes)}
              selection={filterCode}
              setSelection={setFilterCode}
            />
          </Grid>
          : null
        }
      </Grid>

      <TableContainer>
        <Table size="small" sx={{ p: 1, overflow: "auto", minWidth: "70em" }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ p: 1, maxWidth: "2em" }}/>
              <TableCell><strong> Date </strong></TableCell>
              <TableCell><strong> Type </strong></TableCell>
              <TableCell><strong> Description </strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredEvents
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((event: HydratedEvent, i: number) => (
                <EventRow
                  key={i}
                  addressBook={addressBook}
                  event={event}
                  txTags={txTags}
                  setTxTags={setTxTags}
                />
              ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Paginate
        count={filteredEvents.length}
        rowsPerPage={rowsPerPage}
        page={page}
        setPage={setPage}
        setRowsPerPage={setRowsPerPage}
      />

    </Paper>
  );
};
