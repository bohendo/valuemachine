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
import {
  Account,
  AddressBook,
  ErrorEvent,
  Event,
  EventErrorCodes,
  EventTypes,
  GuardChangeEvent,
  HydratedEvent,
  TradeEvent,
  ValueMachine,
} from "@valuemachine/types";
import React, { useEffect, useState } from "react";

import { SelectOne } from "../utils";

import { EventRow } from "./EventRow";

const useStyles = makeStyles((theme: Theme) => createStyles({
  paper: {
    padding: theme.spacing(2),
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
    padding: theme.spacing(1),
  },
  firstCell: {
    maxWidth: theme.spacing(1),
    padding: theme.spacing(1),
  },
}));

type EventTableProps = {
  addressBook: AddressBook;
  vm: ValueMachine;
};
export const EventTable: React.FC<EventTableProps> = ({
  addressBook,
  vm,
}: EventTableProps) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(25);
  const [accounts, setAccounts] = useState([] as Account[]);
  const [filterAccount, setFilterAccount] = useState("");
  const [filterCode, setFilterCode] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filteredEvents, setFilteredEvents] = useState([] as HydratedEvent[]);
  const classes = useStyles();

  useEffect(() => {
    setAccounts(vm.getAccounts());
  }, [addressBook, vm]);

  useEffect(() => {
    setPage(0);
    setFilteredEvents(vm.json?.events?.filter(event =>
      (!filterType || event.type === filterType)
      && (!filterCode || (event as ErrorEvent)?.code === filterCode)
      && (!filterAccount || (
        (event as GuardChangeEvent).to?.endsWith(filterAccount) ||
        (event as GuardChangeEvent).from?.endsWith(filterAccount) ||
        (event as TradeEvent).account?.endsWith(filterAccount)))
    ).sort((e1: Event, e2: Event) =>
      // Sort by date, newest first
      (e1.date > e2.date) ? -1
      : (e1.date < e2.date) ? 1
      : 0
    ).map((e: Event) => vm.getEvent(e.index)) || []);
  }, [vm, filterAccount, filterType, filterCode]);

  useEffect(() => {
    if (filterType !== EventTypes.Error) setFilterCode("");
  }, [filterType]);

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
        {filteredEvents.length === vm.json?.events?.length
          ? `${filteredEvents.length} Events`
          : `${filteredEvents.length} of ${vm.json?.events?.length || 0} Events`
        }
      </Typography>

      <SelectOne
        label="Filter Account"
        choices={accounts.sort()}
        selection={filterAccount}
        setSelection={setFilterAccount}
        toDisplay={val => addressBook.getName(val, true)}
      />

      <SelectOne
        label="Filter Type"
        choices={Object.keys(EventTypes)}
        selection={filterType}
        setSelection={setFilterType}
      />

      {filterType === EventTypes.Error ?
        <SelectOne
          label="Filter Error Code"
          choices={Object.keys(EventErrorCodes)}
          selection={filterCode}
          setSelection={setFilterCode}
        />
        : null
      }

      <TableContainer>
        <Table size="small" className={classes.table}>
          <TableHead>
            <TableRow>
              <TableCell className={classes.firstCell}/>
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
                />
              ))}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[25, 50, 100, 250]}
          component="div"
          count={filteredEvents.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>

    </Paper>
  );
};
