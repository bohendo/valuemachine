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
  AddressEntry,
  AddressBook,
  AddressBookJson,
} from "@valuemachine/types";
import {
  sortAddressEntries
} from "@valuemachine/utils";
import React, { useEffect, useState } from "react";

import { SelectOne } from "../utils";

import { AddressRow } from "./AddressRow";

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
    minWidth: theme.spacing(80),
    overflow: "auto",
  },
}));

type AddressTableProps = {
  addressBook: AddressBook,
  setAddressBookJson: (val: AddressBookJson) => void,
};
export const AddressTable: React.FC<AddressTableProps> = ({
  addressBook,
  setAddressBookJson,
}: AddressTableProps) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(25);
  const [filteredEntries, setFilteredEntries] = useState([] as AddressEntry[]);
  const [filterCategory, setFilterCategory] = useState("");
  const classes = useStyles();

  useEffect(() => {
    setPage(0);
  }, [addressBook]);

  useEffect(() => {
    setFilteredEntries(sortAddressEntries(Object.values(
      addressBook.json
    ).filter(entry =>
      !filterCategory || entry.category === filterCategory
    )));
  }, [addressBook, filterCategory]);

  const editEntry = (oldAddress: string, editedEntry?: AddressEntry): void => {
    const newAddressBook = { ...addressBook.json }; // create new obj to ensure it re-renders
    if (editedEntry) {
      if (editedEntry.address !== oldAddress) {
        console.log(`Replacing old entry for ${oldAddress}`);
        delete newAddressBook[oldAddress];
      }
      console.log(`Setting new entry for ${editedEntry.address}`);
      newAddressBook[editedEntry.address] = editedEntry;
    } else {
      console.log(`Removing old entry for ${oldAddress}`);
      delete newAddressBook[oldAddress];
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
    <Paper className={classes.paper}>

      <TableContainer>

        <Typography align="center" variant="h4" className={classes.title} component="div">
          {filteredEntries.length === Object.keys(addressBook.json).length
            ? `${filteredEntries.length} Addresses`
            : `${filteredEntries.length} of ${Object.keys(addressBook.json).length} Addresses`
          }
        </Typography>

        <SelectOne
          label="Filter Category"
          choices={Array.from(new Set(Object.values(addressBook.json).map(e => e.category)))}
          selection={filterCategory}
          setSelection={setFilterCategory}
        />

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell><strong> Account name </strong></TableCell>
              <TableCell><strong> Category </strong></TableCell>
              <TableCell><strong> Address </strong></TableCell>
              <TableCell><strong> Edit </strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredEntries
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((entry: AddressEntry, i: number) => (
                <AddressRow
                  otherAddresses={
                    filteredEntries.map(e => e.address).filter(a => a !== entry.address)
                  }
                  key={i}
                  editEntry={editEntry}
                  entry={entry}
                />

              ))}
          </TableBody>
        </Table>

        <TablePagination
          rowsPerPageOptions={[25, 50, 100, 250]}
          component="div"
          count={filteredEntries.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>
    </Paper>

  );
};
