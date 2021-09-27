import { isAddress } from "@ethersproject/address";
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
import {
  Account,
  AddressBook,
  Event,
  EventTypes,
  GuardChangeEvent,
  HydratedEvent,
  TradeEvent,
  ValueMachine,
} from "@valuemachine/types";
import React, { useEffect, useState } from "react";

import { EventRow } from "./EventRow";

const useStyles = makeStyles((theme: Theme) => createStyles({
  paper: {
    minWidth: "500px",
    padding: theme.spacing(2),
  },
  title: {
    margin: theme.spacing(1),
  },
  select: {
    marginBottom: theme.spacing(2),
    marginLeft: theme.spacing(2),
    minWidth: 160,
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
  }, [vm, filterAccount, filterType]);

  const handleFilterAccountChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    if (typeof event.target.value !== "string") return;
    setFilterAccount(event.target.value);
  };

  const handleFilterTypeChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    if (typeof event.target.value !== "string") return;
    setFilterType(event.target.value);
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
          {filteredEvents.length === vm.json?.events?.length
            ? `${filteredEvents.length} Events`
            : `${filteredEvents.length} of ${vm.json?.events?.length || 0} Events`
          }
        </Typography>

        <FormControl className={classes.select}>
          <InputLabel id="select-filter-account">Filter Account</InputLabel>
          <Select
            labelId="select-filter-account"
            id="select-filter-account"
            value={filterAccount || ""}
            onChange={handleFilterAccountChange}
          >
            <MenuItem value={""}>-</MenuItem>
            {accounts
              .sort((a1, a2) => a1 < a2 ? 1 : -1)
              .sort((a1, a2) => isAddress(a1) && !isAddress(a2) ? 1 : -1)
              .map((account, i) => (
                <MenuItem key={i} value={account}>
                  {addressBook?.getName(account, true)}
                </MenuItem>
              ))
            }
          </Select>
        </FormControl>

        <FormControl className={classes.select}>
          <InputLabel id="select-filter-type">Filter Type</InputLabel>
          <Select
            labelId="select-filter-type"
            id="select-filter-type"
            value={filterType || ""}
            onChange={handleFilterTypeChange}
          >
            <MenuItem value={""}>-</MenuItem>
            {Object.keys(EventTypes).map((type, i) => (
              <MenuItem key={i} value={type}>{type}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong> Date </strong></TableCell>
              <TableCell><strong> Type </strong></TableCell>
              <TableCell><strong> Description </strong></TableCell>
              <TableCell><strong> Details </strong></TableCell>
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
