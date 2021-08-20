import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableContainer from "@material-ui/core/TableContainer";
import TableHead from "@material-ui/core/TableHead";
import TablePagination from "@material-ui/core/TablePagination";
import TableRow from "@material-ui/core/TableRow";
import {
  AddressEntry,
  AddressBook,
  AddressBookJson,
} from "@valuemachine/types";
import React, { useEffect, useState } from "react";

import { AddressRow } from "./AddressRow";

const useStyles = makeStyles((theme: Theme) => createStyles({
  root: {
    margin: theme.spacing(1),
    maxWidth: "98%",
  },
  divider: {
    marginBottom: theme.spacing(2),
    marginTop: theme.spacing(2),
  },
  select: {
    margin: theme.spacing(3),
    minWidth: 160,
  },
  input: {
    margin: theme.spacing(1),
    minWidth: 120,
    maxWidth: 300,
  },
  exporter: {
    marginBottom: theme.spacing(4),
    marginLeft: theme.spacing(4),
    marginRight: theme.spacing(4),
    marginTop: theme.spacing(0),
  },
  importer: {
    marginBottom: theme.spacing(1),
    marginLeft: theme.spacing(4),
    marginRight: theme.spacing(4),
    marginTop: theme.spacing(0),
  },
  syncing: {
    marginTop: theme.spacing(4),
    marginLeft: theme.spacing(4),
    marginRight: theme.spacing(4),
  },
  snackbar: {
    width: "100%"
  },
  button: {
    marginBottom: theme.spacing(1.5),
    marginLeft: theme.spacing(2),
    marginRight: theme.spacing(2),
  },
  title: {
    margin: theme.spacing(2),
  },
  subtitle: {
    margin: theme.spacing(2),
  },
  deleteAll: {
    margin: theme.spacing(2),
  },
  paper: {
    padding: theme.spacing(2),
  },
  table: {
    minWidth: "600px",
    padding: theme.spacing(2),
  },
}));

type PropTypes = {
  addressBook: AddressBook,
  setAddressBookJson: (val: AddressBookJson) => void,
};
export const AddressTable: React.FC<PropTypes> = ({
  addressBook,
  setAddressBookJson,
}: PropTypes) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(25);

  const [allAddresses, setAllAddresses] = useState([] as string[]);
  const classes = useStyles();

  useEffect(() => {
    setAllAddresses(addressBook.addresses);
    setPage(0);
  }, [addressBook]);

  const editEntry = (address: string, editedEntry?: AddressEntry): void => {
    const newAddressBook = { ...addressBook.json }; // create new array to ensure it re-renders
    if (editedEntry) {
      if (editedEntry.address !== address) {
        delete newAddressBook[address];
      }
      newAddressBook[editedEntry.address] = editedEntry;
    } else {
      delete newAddressBook[address];
    }
    setAddressBookJson(newAddressBook);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  return (
    <Paper className={classes.table}>

      <TableContainer>
        <TablePagination
          rowsPerPageOptions={[25, 50, 100, 250]}
          component="div"
          count={allAddresses.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell><strong> Account name </strong></TableCell>
              <TableCell><strong> Category </strong></TableCell>
              <TableCell><strong> Guard </strong></TableCell>
              <TableCell><strong> Eth Address </strong></TableCell>
              <TableCell><strong> Edit </strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.values(addressBook.json)
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((entry: AddressEntry, i: number) => (
                <AddressRow
                  otherAddresses={[...allAddresses.slice(0, i), ...allAddresses.slice(i + 1)]}
                  key={i}
                  editEntry={editEntry}
                  address={entry.address}
                  entry={entry}
                />

              ))}
          </TableBody>
        </Table>

        <TablePagination
          rowsPerPageOptions={[25, 50, 100, 250]}
          component="div"
          count={allAddresses.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>
    </Paper>

  );
};
