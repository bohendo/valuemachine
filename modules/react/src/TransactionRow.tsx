import { makeStyles } from "@material-ui/core/styles";
import Box from "@material-ui/core/Box";
import Collapse from "@material-ui/core/Collapse";
import IconButton from "@material-ui/core/IconButton";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import Typography from "@material-ui/core/Typography";
import KeyboardArrowDownIcon from "@material-ui/icons/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@material-ui/icons/KeyboardArrowUp";
import { describeTransaction } from "@valuemachine/transactions";
import {
  AddressBook,
  Transaction,
  Transfer,
} from "@valuemachine/types";
import { round } from "@valuemachine/utils";
import React, { useState } from "react";

import { HexString } from "./HexString";

const useStyles = makeStyles((theme) => ({
  tableRow: {
    "& > *": {
      borderBottom: "unset",
      margin: theme.spacing(0),
    },
    overflow: "auto",
  },
  subTable: {
    maxWidth: theme.spacing(111),
    overflow: "auto",
  }
}));

export const TransactionRow = ({
  addressBook,
  tx,
}: {
  addressBook: AddressBook;
  tx: Transaction;
}) => {
  const [open, setOpen] = useState(false);
  const classes = useStyles();
  const date = (new Date(tx.date)).toISOString().replace(".000Z", "");
  return (
    <React.Fragment>
      <TableRow className={classes.tableRow}>
        <TableCell>
          <Typography noWrap variant="body2">{date.split("T")[0]}</Typography>
          <Typography noWrap variant="body2">{date.split("T")[1]}</Typography>
        </TableCell>
        <TableCell> {describeTransaction(addressBook, tx)} </TableCell>
        <TableCell> {tx.uuid ? <HexString value={tx.uuid}/> : "N/A"} </TableCell>
        <TableCell> {tx.apps.join(", ")} </TableCell>
        <TableCell> {tx.sources.join(", ")} </TableCell>
        <TableCell onClick={() => {
          setOpen(!open); open || console.log(tx);
        }} style={{ minWidth: "140px" }} >
          {`${tx.transfers.length} transfer${tx.transfers.length === 1 ? "" : "s"}`}
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
                Transfers
              </Typography>
              <Table size="small" className={classes.subTable}>
                <TableHead>
                  <TableRow>
                    <TableCell><strong> Category </strong></TableCell>
                    <TableCell><strong> Asset </strong></TableCell>
                    <TableCell><strong> Amount </strong></TableCell>
                    <TableCell><strong> From </strong></TableCell>
                    <TableCell><strong> To </strong></TableCell>
                    <TableCell><strong> Index </strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tx.transfers.map((transfer: Transfer, i: number) => (
                    <TableRow key={i}>
                      <TableCell> {transfer.category} </TableCell>
                      <TableCell> {transfer.asset} </TableCell>
                      <TableCell> {round(transfer.amount || "1")} </TableCell>
                      <TableCell>
                        <HexString
                          display={addressBook?.getName(transfer.from, true)}
                          value={transfer.from}
                        />
                      </TableCell>
                      <TableCell>
                        <HexString
                          display={addressBook?.getName(transfer.to, true)}
                          value={transfer.to}
                        />
                      </TableCell>
                      <TableCell> {transfer.index} </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </React.Fragment>
  );
};
