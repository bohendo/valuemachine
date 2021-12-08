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
  AddressEntry,
  AddressBook,
  AddressBookJson,
  sortAddressEntries
} from "@valuemachine/transactions";
import React, { useEffect, useState } from "react";

import { Paginate, SelectOne } from "../utils";

import { AddressRow } from "./AddressRow";

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

  return (<>
    <Paper sx={{ p: 2 }}>

      <Grid container>
        <Grid item xs={12}>
          <Typography align="center" variant="h4" sx={{ p: 2 }} component="div">
            {filteredEntries.length === Object.keys(addressBook.json).length
              ? `${filteredEntries.length} Addresses`
              : `${filteredEntries.length} of ${Object.keys(addressBook.json).length} Addresses`
            }
          </Typography>
        </Grid>

        <Grid item xs={12}>
          <SelectOne
            label="Filter Category"
            choices={Array.from(new Set(Object.values(addressBook.json).map(e => e.category)))}
            selection={filterCategory}
            setSelection={setFilterCategory}
          />
        </Grid>
      </Grid>

      <TableContainer>
        <Table size="small" sx={{ minWidth: "48em", overflow: "auto" }}>
          <TableHead>
            <TableRow>
              <TableCell><strong> Account name </strong></TableCell>
              <TableCell><strong> Category </strong></TableCell>
              <TableCell><strong> Guard </strong></TableCell>
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
      </TableContainer>
      <Paginate
        count={filteredEntries.length}
        rowsPerPage={rowsPerPage}
        page={page}
        setPage={setPage}
        setRowsPerPage={setRowsPerPage}
      />

    </Paper>
  </>);
};
