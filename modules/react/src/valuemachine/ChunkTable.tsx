import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Switch from "@mui/material/Switch";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import {
  Account,
  AddressBook,
  Asset,
  AssetChunk,
  ValueMachine,
} from "@valuemachine/types";
import { dedup } from "@valuemachine/utils";
import React, { useEffect, useState } from "react";

import { SelectOne } from "../utils";

import { ChunkRow } from "./ChunkRow";

type ChunkTableProps = {
  addressBook?: AddressBook;
  vm?: ValueMachine;
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

  useEffect(() => {
    setAccounts(vm?.getAccounts() || []);
  }, [addressBook, vm]);

  useEffect(() => {
    setAssets(dedup(vm?.json.chunks.map(chunk => chunk.asset) || []));
  }, [addressBook, vm]);

  useEffect(() => {
    setPage(0);
    setFilteredChunks(vm?.json?.chunks?.filter(chunk =>
      (!filterHeld || (filterAccount ? filterAccount === chunk.account : !!chunk.account))
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

  return (<>

    <Paper sx={{ p: 2 }}>

      <Grid container>
        <Grid item xs={12}>
          <Typography align="center" variant="h4" sx={{ p: 2 }} component="div">
            {filteredChunks.length === vm?.json?.chunks?.length
              ? `${filteredChunks.length} Chunks`
              : `${filteredChunks.length} of ${vm?.json?.chunks?.length || 0} Chunks`
            }
          </Typography>
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
            label="Filter Asset"
            choices={assets.sort()}
            selection={filterAsset}
            setSelection={setFilterAsset}
          />
        </Grid>

        <Grid item>
          <FormControl>
            <FormControlLabel
              sx={{ m: 3, minWidth: "12em" }}
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
        </Grid>
      </Grid>

      <TableContainer>
        <Table size="small" sx={{ overflow: "auto", minWidth: "70em" }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ p: 1, maxWidth: "4em" }}><strong> Owners </strong></TableCell>
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

  </>);
};
