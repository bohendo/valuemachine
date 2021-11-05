import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { getTaxRows, securityFeeMap } from "@valuemachine/taxes";
import {
  Assets,
} from "@valuemachine/transactions";
import {
  AddressBook,
  Guard,
  Prices,
  TaxRow,
  TxTags,
  ValueMachine,
} from "@valuemachine/types";
import {
  commify,
} from "@valuemachine/utils";
import React, { useEffect, useState } from "react";

import { Paginate } from "../utils";

type TaxTableProps = {
  addressBook: AddressBook;
  guard: Guard;
  prices: Prices;
  txTags: TxTags;
  vm: ValueMachine;
};
export const TaxTable: React.FC<TaxTableProps> = ({
  addressBook,
  guard,
  prices,
  txTags,
  vm,
}: TaxTableProps) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(25);
  const [taxes, setTaxes] = React.useState([] as TaxRow[]);
  const [unit, setUnit] = React.useState(Assets.ETH);

  useEffect(() => {
    setUnit(securityFeeMap[guard]);
  }, [guard]);

  useEffect(() => {
    if (!guard || !vm?.json?.events?.length) return;
    setTaxes(getTaxRows({ addressBook, guard, prices, txTags, vm }));
  }, [addressBook, guard, prices, txTags, vm]);

  return (<>
    <Paper sx={{ p: 2 }}>

      <Typography align="center" variant="h4" sx={{ pt: 2 }} component="div">
        {`${taxes.length} Taxable ${guard} Event${taxes.length > 1 ? "s" : ""}`}
      </Typography>

      <TableContainer>
        <Table size="small" sx={{ minWidth: "64em", overflow: "auto" }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ minWidth: "8em" }}><strong> Date </strong></TableCell>
              <TableCell><strong> Action </strong></TableCell>
              <TableCell><strong> Asset </strong></TableCell>
              <TableCell><strong> {`Price (${unit}/Asset)`} </strong></TableCell>
              <TableCell><strong> {`Value (${unit})`} </strong></TableCell>
              <TableCell sx={{ minWidth: "8em" }}><strong> Receive Date </strong></TableCell>
              <TableCell><strong> {`Receive Price (${unit}/Asset)`} </strong></TableCell>
              <TableCell><strong> {`Capital Change (${unit})`} </strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {taxes
              .sort((r1, r2) =>
                new Date(r1.date).getTime() > new Date(r2.date).getTime()
                  ? -1
                  : new Date(r1.date).getTime() < new Date(r2.date).getTime()
                    ? 1
                    : 0
              )
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((row: TaxRow, i: number) => (
                <TableRow key={i}>
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
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Paginate
        count={taxes.length}
        page={page}
        rowsPerPage={rowsPerPage}
        setPage={setPage}
        setRowsPerPage={setRowsPerPage}
      />
    </Paper>
  </>);
};
