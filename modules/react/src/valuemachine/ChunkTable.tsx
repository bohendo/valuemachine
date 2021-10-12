import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import FormControl from "@material-ui/core/FormControl";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Paper from "@material-ui/core/Paper";
import Switch from "@material-ui/core/Switch";
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
  Asset,
  AssetChunk,
  ValueMachine,
} from "@valuemachine/types";
import { dedup } from "@valuemachine/utils";
import React, { useEffect, useState } from "react";

import { ChunkRow } from "./ChunkRow";

import { SelectOne } from "../utils";

const useStyles = makeStyles((theme: Theme) => createStyles({
  paper: {
    padding: theme.spacing(1),
  },
  title: {
    padding: theme.spacing(2),
  },
  toggleLabel: {
    margin: theme.spacing(3),
    minWidth: theme.spacing(20),
  },
  table: {
    minWidth: theme.spacing(115),
    overflow: "auto",
  },
  firstCell: {
    maxWidth: theme.spacing(6),
    padding: theme.spacing(1),
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
  const [assets, setAssets] = useState([] as Asset[]);
  const [filterAccount, setFilterAccount] = useState("");
  const [filterAsset, setFilterAsset] = useState("");
  const [filterHeld, setFilterHeld] = useState(false);
  const [filteredChunks, setFilteredChunks] = useState([] as AssetChunk[]);
  const classes = useStyles();

  useEffect(() => {
    setAccounts(vm.getAccounts());
  }, [addressBook, vm]);

  useEffect(() => {
    setAssets(dedup(vm.json.chunks.map(chunk => chunk.asset)));
  }, [addressBook, vm]);

  useEffect(() => {
    setPage(0);
    setFilteredChunks(vm.json?.chunks?.filter(chunk =>
      (!filterHeld || chunk.account)
      && (!filterAccount || (
        chunk.history?.some(hist => hist.account.endsWith(filterAccount)) ||
        chunk.account?.endsWith(filterAccount)))
      && (!filterAsset || chunk.asset === filterAsset)
    ).sort((c1: AssetChunk, c2: AssetChunk) => c2.index - c1.index) || []);
  }, [vm, filterAccount, filterAsset, filterHeld]);

  const handleFilterHeldChange = (event: React.ChangeEvent<{ checked: unknown }>) => {
    if (typeof event.target.checked !== "boolean") return;
    setFilterHeld(event.target.checked);
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

      <Typography align="center" variant="h4" className={classes.title} component="div">
        {filteredChunks.length === vm.json?.chunks?.length
          ? `${filteredChunks.length} Chunks`
          : `${filteredChunks.length} of ${vm.json?.chunks?.length || 0} Chunks`
        }
      </Typography>

      <SelectOne
        label="Filter Account"
        choices={accounts.sort()}
        selection={filterAccount}
        setSelection={setFilterAccount}
        toDisplay={val => addressBook?.getName(val, true)}
      />

      <SelectOne
        label="Filter Asset"
        choices={assets.sort()}
        selection={filterAsset}
        setSelection={setFilterAsset}
      />

      <FormControl>
        <FormControlLabel
          className={classes.toggleLabel}
          label="Presently Held"
          control={
            <Switch
              id="toggle-filter-held"
              checked={filterHeld}
              onChange={handleFilterHeldChange}
            />
          }
        />
      </FormControl>

      <TableContainer>
        <Table size="small" className={classes.table}>
          <TableHead>
            <TableRow>
              <TableCell className={classes.firstCell}><strong> Owners </strong></TableCell>
              <TableCell><strong> Asset </strong></TableCell>
              <TableCell><strong> Amount </strong></TableCell>
              <TableCell><strong> Receive Date </strong></TableCell>
              <TableCell><strong> Dispose Date </strong></TableCell>
              <TableCell><strong> Inputs </strong></TableCell>
              <TableCell><strong> Outputs </strong></TableCell>
              <TableCell><strong> Index </strong></TableCell>
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
