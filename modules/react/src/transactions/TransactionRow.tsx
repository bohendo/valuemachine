import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Backspace";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Collapse from "@mui/material/Collapse";
import IconButton from "@mui/material/IconButton";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { describeTransaction } from "@valuemachine/transactions";
import {
  AddressBook,
  Transaction,
  Transfer,
  TxId,
  TxTags,
} from "@valuemachine/types";
import { round } from "@valuemachine/utils";
import React, { useState } from "react";

import { HexString } from "../utils";

import { TransactionEditor } from "./TransactionEditor";

type TransactionRowProps = {
  addressBook: AddressBook;
  tx: Transaction;
  editTx?: (uuid: TxId, val?: Transaction) => void;
  txTags?: TxTags;
};
export const TransactionRow: React.FC<TransactionRowProps> = ({
  addressBook,
  tx,
  editTx,
  txTags,
}: TransactionRowProps) => {
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [newTx, setNewTx] = useState({} as Partial<Transaction>);
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

      <TableRow sx={{ overflow: "auto", ["&>td"]: { borderBottom: 0 } }}>
        <TableCell onClick={() => setOpen(!open)} sx={{ p: 1, maxWidth: "4em" }}>
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
        <TableCell> {
          txTags?.[tx.uuid]?.description || describeTransaction(addressBook, tx)
        } </TableCell>
        {editTx ?
          <TableCell>
            <IconButton color="secondary" onClick={toggleEditMode}>
              <EditIcon />
            </IconButton>
          </TableCell>
          : null}
      </TableRow>

      <TableRow sx={{ overflow: "auto", ["&>td"]: { borderBottom: 0 } }}>
        <TableCell sx={{ py: 0 }} colSpan={6}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box pb={2} px={4}>
              <Typography variant="h6" gutterBottom component="div">
                Method: {tx.method || "Unknown"}
              </Typography>
              <Typography variant="h6" gutterBottom component="div">
                Transfers
              </Typography>
              <Table size="small" sx={{ maxWidth: "80em", overflow: "auto" }}>
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
                      }{
                        txTags?.[`${tx.uuid}/${transfer.index}`]?.multiplier ? ` (x${txTags?.[`${tx.uuid}/${transfer.index}`]?.multiplier})` : null
                      }</TableCell>
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
        <TableCell sx={{ py: 0 }} colSpan={6}>
          <Collapse in={editMode} timeout="auto" unmountOnExit>
            <Box pb={2} px={4}>
              <TransactionEditor
                tx={newTx}
                setTx={saveTx}
              />

              <Button
                sx={{ ml: 3, mb: 2 }}
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
