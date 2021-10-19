import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import Box from "@mui/material/Box";
import Collapse from "@mui/material/Collapse";
import IconButton from "@mui/material/IconButton";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableHead from "@mui/material/TableHead";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import {
  AddressBook,
  AssetChunk,
} from "@valuemachine/types";
import React, { useEffect, useState } from "react";

import { HexString } from "../utils";

type ChunkRowProps = {
  addressBook: AddressBook;
  chunk: AssetChunk;
};
export const ChunkRow: React.FC<ChunkRowProps> = ({
  addressBook,
  chunk,
}: ChunkRowProps) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (chunk && open) console.log(chunk);
  }, [chunk, open]);

  const fmtDate = (dateStr?: string): string =>
    (dateStr || "").replace("T", " ").replace(/(.000)?Z/, "");

  return (
    <React.Fragment>
      <TableRow>
        <TableCell onClick={() => setOpen(!open)} sx={{ p: 1, maxWidth: "4em" }}>
          <IconButton aria-label="expand row" size="small" >
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
          {chunk.history.length}
        </TableCell>

        <TableCell> {chunk.asset} </TableCell>
        <TableCell> {chunk.amount} </TableCell>
        <TableCell> {
          fmtDate(chunk.history[0].date)
        } </TableCell>
        <TableCell> {
          fmtDate(chunk.disposeDate)|| "Presently Held"
        } </TableCell>
        <TableCell sx={{ maxWidth: "16em" }}> {chunk.inputs?.join(", ")} </TableCell>
        <TableCell sx={{ maxWidth: "16em" }}> {chunk.outputs?.join(", ")} </TableCell>
        <TableCell> {chunk.index} </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box pb={2} px={4}>
              <Typography variant="h6" gutterBottom component="div">
                {`Ownership History`}
              </Typography>

              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong> Account </strong></TableCell>
                    <TableCell><strong> Receieve Date </strong></TableCell>
                    <TableCell><strong> Dispose Date </strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {chunk.history.map((history: { date: string; account: string }, i: number) => {
                    const date = history.date;
                    const nextDate = chunk.history[i + 1]?.date
                      || chunk.disposeDate
                      || "Presently Held";
                    const account = history.account;
                    return (
                      <TableRow key={i}>
                        <TableCell> {
                          <HexString value={account} display={addressBook?.getName(account, true)}/>
                        }</TableCell>
                        <TableCell> {fmtDate(date)} </TableCell>
                        <TableCell> {fmtDate(nextDate)} </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </React.Fragment>
  );
};
