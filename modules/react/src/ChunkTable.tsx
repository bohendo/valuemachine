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
  AssetChunk,
  ValueMachine,
} from "@valuemachine/types";
import React, { useEffect, useState } from "react";

import { ChunkRow } from "./ChunkRow";

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

type ChunkTableProps = {
  addressBook: AddressBook;
  vm: ValueMachine;
};
export const ChunkTable: React.FC<ChunkTableProps> = ({
  addressBook,
  vm,
}: ChunkTableProps) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(25);
  const [accounts, setAccounts] = useState([] as Account[]);
  const [filterAccount, setFilterAccount] = useState("");
  const [filteredChunks, setFilteredChunks] = useState([] as AssetChunk[]);
  const classes = useStyles();

  useEffect(() => {
    setAccounts(addressBook.addresses.filter(a => addressBook.isSelf(a)));
  }, [addressBook, vm]);

  useEffect(() => {
    setPage(0);
    setFilteredChunks(vm.json?.chunks?.filter(chunk =>
      (!filterAccount || (
        chunk.history?.some(hist => hist.account.endsWith(filterAccount)) ||
        chunk.account?.endsWith(filterAccount)))
    ).sort((c1: AssetChunk, c2: AssetChunk) => c1.index - c2.index) || []);
  }, [vm, filterAccount]);

  const handleFilterAccountChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    if (typeof event.target.value !== "string") return;
    setFilterAccount(event.target.value);
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
          {filteredChunks.length === vm.json?.chunks?.length
            ? `${filteredChunks.length} Chunks`
            : `${filteredChunks.length} of ${vm.json?.chunks?.length || 0} Chunks`
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
                  {addressBook?.getName(account) || account}
                </MenuItem>
              ))
            }
          </Select>
        </FormControl>

        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong> Index </strong></TableCell>
              <TableCell><strong> Asset </strong></TableCell>
              <TableCell><strong> Quantity </strong></TableCell>
              <TableCell><strong> Receive Date </strong></TableCell>
              <TableCell><strong> Dispose Date </strong></TableCell>
              <TableCell><strong> Inputs </strong></TableCell>
              <TableCell><strong> Outputs </strong></TableCell>
              <TableCell><strong> History </strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredChunks
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((chunk: AssetChunk, i: number) => (
                <ChunkRow key={i} addressBook={addressBook} chunk={chunk}/>
              ))}
          </TableBody>
        </Table>

        <TablePagination
          rowsPerPageOptions={[25, 50, 100, 250]}
          component="div"
          count={filteredChunks.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />

      </TableContainer>

    </Paper>
  );
};
