import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import Box from "@material-ui/core/Box";
import Collapse from "@material-ui/core/Collapse";
import IconButton from "@material-ui/core/IconButton";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableHead from "@material-ui/core/TableHead";
import TableCell from "@material-ui/core/TableCell";
import TableRow from "@material-ui/core/TableRow";
import Typography from "@material-ui/core/Typography";
import KeyboardArrowDownIcon from "@material-ui/icons/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@material-ui/icons/KeyboardArrowUp";
import {
  AddressBook,
  AssetChunk,
} from "@valuemachine/types";
import {
  round as defaultRound,
} from "@valuemachine/utils";
import React, { useEffect, useState } from "react";

import { HexString } from "./HexString";

const round = num => defaultRound(num, 4);

const useStyles = makeStyles((theme: Theme) => createStyles({
  putsRow: {
    maxWidth: theme.spacing(32),
  }
}));

type ChunkRowProps = {
  addressBook: AddressBook;
  chunk: AssetChunk;
};
export const ChunkRow: React.FC<ChunkRowProps> = ({
  addressBook,
  chunk,
}: ChunkRowProps) => {
  const [open, setOpen] = useState(false);
  const classes = useStyles();

  useEffect(() => {
    if (chunk && open) console.log(chunk);
  }, [chunk, open]);

  const fmtDate = (dateStr?: string): string =>
    (dateStr || "").replace("T", " ").replace(/(.000)?Z/, "");

  return (
    <React.Fragment>
      <TableRow>
        <TableCell> {chunk.index} </TableCell>
        <TableCell> {chunk.asset} </TableCell>
        <TableCell> {round(chunk.quantity)} </TableCell>
        <TableCell> {
          fmtDate(chunk.history[0].date)
        } </TableCell>
        <TableCell> {
          fmtDate(chunk.disposeDate)|| "Presently Held"
        } </TableCell>
        <TableCell className={classes.putsRow}> {chunk.inputs?.join(", ")} </TableCell>
        <TableCell className={classes.putsRow}> {chunk.outputs?.join(", ")} </TableCell>
        <TableCell onClick={() => setOpen(!open)} style={{ minWidth: "140px" }}>
          History
          <IconButton aria-label="expand row" size="small" >
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
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
                          <HexString value={account} display={addressBook?.getName(account)}/>
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
