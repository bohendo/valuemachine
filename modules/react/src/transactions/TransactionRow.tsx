import { makeStyles } from "@material-ui/core/styles";
import Box from "@material-ui/core/Box";
import Button from "@material-ui/core/Button";
import Collapse from "@material-ui/core/Collapse";
import IconButton from "@material-ui/core/IconButton";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import Typography from "@material-ui/core/Typography";
import EditIcon from "@material-ui/icons/Edit";
import DeleteIcon from "@material-ui/icons/Backspace";
import KeyboardArrowDownIcon from "@material-ui/icons/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@material-ui/icons/KeyboardArrowUp";
import { describeTransaction } from "@valuemachine/transactions";
import {
  AddressBook,
  Transaction,
  Transfer,
  TxId,
} from "@valuemachine/types";
import { round } from "@valuemachine/utils";
import React, { useState } from "react";

import { HexString } from "../utils";

import { TransactionEditor } from "./TransactionEditor";

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
  },
  firstCell: {
    maxWidth: theme.spacing(16),
    padding: theme.spacing(1),
  },
  button: {
    marginLeft: theme.spacing(3),
    marginBottom: theme.spacing(2),
  }
}));

type TransactionRowProps = {
  addressBook: AddressBook;
  tx: Transaction;
  editTx?: (uuid: TxId, val?: Transaction) => void;
};
export const TransactionRow: React.FC<TransactionRowProps> = ({
  addressBook,
  tx,
  editTx,
}: TransactionRowProps) => {
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [newTx, setNewTx] = useState({} as Partial<Transaction>);
  const classes = useStyles();
  const date = (new Date(tx.date)).toISOString().replace(".000Z", "");

  const toggleEditMode = () => {
    setEditMode(!editMode);
    if (editMode) {
      setNewTx({});
    } else {
      setNewTx(JSON.parse(JSON.stringify(tx)));
    }
  };

  const saveTx = (newTx: Transaction) => {
    if (!editTx || !newTx) return;
    editTx(newTx.uuid, newTx);
    setEditMode(false);
  };

  const deleteTx = () => {
    if (!editTx) return;
    editTx(tx.uuid);
    setEditMode(false);
  };

  return (
    <React.Fragment>

      <TableRow className={classes.tableRow}>
        <TableCell onClick={() => setOpen(!open)} className={classes.firstCell}>
          <IconButton aria-label="expand row" size="small" >
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
          {tx.transfers.length}
        </TableCell>
        <TableCell>
          <Typography noWrap variant="body2">{date.split("T")[0]}</Typography>
          <Typography noWrap variant="body2">{date.split("T")[1]}</Typography>
        </TableCell>
        <TableCell> {tx.uuid ? <HexString value={tx.uuid}/> : "N/A"} </TableCell>
        <TableCell> {tx.sources.join(", ")} </TableCell>
        <TableCell> {tx.apps.join(", ")} </TableCell>
        <TableCell> {describeTransaction(addressBook, tx)} </TableCell>
        {editTx ?
          <TableCell>
            <IconButton color="secondary" onClick={toggleEditMode}>
              <EditIcon />
            </IconButton>
          </TableCell>
          : null}
      </TableRow>

      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box pb={2} px={4}>
              <Typography variant="h6" gutterBottom component="div">
                Method: {tx.method || "Unknown"}
              </Typography>
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
                      <TableCell> {
                        transfer.amount === "ALL" ? transfer.amount : round(transfer.amount || "1")
                      } </TableCell>
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

      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
          <Collapse in={editMode} timeout="auto" unmountOnExit>
            <Box pb={2} px={4}>
              <TransactionEditor
                tx={newTx}
                setTx={saveTx}
              />

              <Button
                className={classes.button}
                color="primary"
                onClick={deleteTx}
                size="small"
                startIcon={<DeleteIcon />}
                variant="contained"
              >
                {"Delete Transaction"}
              </Button>

            </Box>
          </Collapse>
        </TableCell>
      </TableRow>

    </React.Fragment>
  );
};
