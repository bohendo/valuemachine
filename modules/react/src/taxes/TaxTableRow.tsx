import Box from "@mui/material/Box";
import Collapse from "@mui/material/Collapse";
import IconButton from "@mui/material/IconButton";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import {
  TaxActions,
  TaxRow,
  TxTags,
  TxId,
} from "@valuemachine/types";
import {
  commify,
} from "@valuemachine/utils";
import React, { useState } from "react";

import { TxTagsEditor } from "../txTags";

type TaxTableRowProps = {
  row: TaxRow;
  setTxTags: (val: TxTags) => void;
  txId: TxId;
  txTags: TxTags;
};
export const TaxTableRow: React.FC<TaxTableRowProps> = ({
  row,
  setTxTags,
  txId,
  txTags,
}: TaxTableRowProps) => {
  const [open, setOpen] = useState(false);

  return (<>
    <TableRow>
      <TableCell onClick={() => setOpen(!open)} sx={{ p: 1, maxWidth: "4em" }}>
        <IconButton aria-label="expand row" size="small" >
          {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
        </IconButton>
      </TableCell>
      <TableCell sx={{ minWidth: "8em" }}> {
        row.date.replace("T", " ").replace(".000Z", "")
      } </TableCell>
      <TableCell> {row.action} </TableCell>
      <TableCell> {`${commify(row.amount)} ${row.asset}`} </TableCell>
      <TableCell> {commify(row.price)} </TableCell>
      <TableCell> {commify(row.value)} </TableCell>
      <TableCell sx={{ minWidth: "8em" }}> {row.receiveDate.replace("T", " ").replace(".000Z", "")} </TableCell>
      <TableCell> {commify(row.receivePrice)} </TableCell>
      <TableCell> {commify(row.capitalChange)} </TableCell>
      <TableCell> {
        !row.action ? ""
        : row.action === TaxActions.Expense ? (row.tag.expenseType || "")
        : row.action === TaxActions.Income ? (row.tag.incomeType || "")
        : ""
      } </TableCell>
    </TableRow>

    <TableRow sx={{ overflow: "auto", ["&>td"]: { borderBottom: 0 } }}>
      <TableCell sx={{ py: 0 }} colSpan={10}>
        <Collapse in={open} timeout="auto" unmountOnExit>
          <Box pb={2} px={4}>
            <TxTagsEditor
              setTxTags={setTxTags}
              txId={txId}
              txTags={txTags}
            />
          </Box>
        </Collapse>
      </TableCell>
    </TableRow>

  </>);
};
