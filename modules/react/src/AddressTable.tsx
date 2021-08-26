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
  AddressEntry,
  AddressBook,
  AddressBookJson,
  AddressCategories,
} from "@valuemachine/types";
import React, { useEffect, useState } from "react";

import { AddressRow } from "./AddressRow";

const useStyles = makeStyles((theme: Theme) => createStyles({
  paper: {
    minWidth: "600px",
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
    setFilteredEntries(Object.values(
      addressBook.json
    ).filter(entry =>
      !filterCategory || entry.category === filterCategory
    ).sort((e1, e2) =>
      // put self addresses first
      (
        e1.category !== AddressCategories.Self &&
        e2.category === AddressCategories.Self
      ) ? 1
        : (
          e1.category === AddressCategories.Self &&
          e2.category !== AddressCategories.Self
        ) ? -1
          // sort by category
          : (e1.category.toLowerCase() > e2.category.toLowerCase()) ? 1
          : (e1.category.toLowerCase() < e2.category.toLowerCase()) ? -1
          // then sort by name
          : (e1.name.toLowerCase() > e2.name.toLowerCase()) ? 1
          : (e1.name.toLowerCase() < e2.name.toLowerCase()) ? -1
          // then sort by address
          : (e1.address.toLowerCase() > e2.address.toLowerCase()) ? 1
          : (e1.address.toLowerCase() < e2.address.toLowerCase()) ? -1
          : 0
    ));
  }, [addressBook, filterCategory]);

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

  const handleFilterChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    if (typeof event.target.value !== "string") return;
    setFilterCategory(event.target.value);
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

        <FormControl className={classes.select}>
          <InputLabel id="select-filter-category">Filter Category</InputLabel>
          <Select
            labelId="select-filter-category"
            id="select-filter-category"
            value={filterCategory || ""}
            onChange={handleFilterChange}
          >
            <MenuItem value={""}>-</MenuItem>
            {Array.from(new Set(Object.values(addressBook.json).map(e => e.category))).map(cat => (
              <MenuItem key={cat} value={cat}>{cat}</MenuItem>
            ))}
          </Select>
        </FormControl>

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
                  address={entry.address}
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
