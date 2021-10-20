import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { getTaxRows, securityFeeMap } from "@valuemachine/taxes";
import {
  Assets,
} from "@valuemachine/transactions";
import {
  TaxRow,
  Guard,
  Prices,
  ValueMachine,
} from "@valuemachine/types";
import {
  commify,
} from "@valuemachine/utils";
import React, { useEffect, useState } from "react";

const { ETH } = Assets;

type TaxTableProps = {
  guard: Guard;
  prices: Prices;
  vm: ValueMachine;
};
export const TaxTable: React.FC<TaxTableProps> = ({
  guard,
  prices,
  vm,
}: TaxTableProps) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(25);
  const [taxes, setTaxes] = React.useState([] as TaxRow[]);
  const [unit, setUnit] = React.useState(ETH);

  useEffect(() => {
    setUnit(securityFeeMap[guard]);
  }, [guard]);

  useEffect(() => {
    if (!guard || !vm?.json?.events?.length) return;
    setTaxes(getTaxRows({ guard, prices, vm })); 
  }, [guard, prices, vm]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  return (<>

    <Paper sx={{ p: 2, minWidth: "80em" }}>
      <Typography align="center" variant="h4" sx={{ pt: 2 }} component="div">
        {`${taxes.length} Taxable ${guard} Event${taxes.length > 1 ? "s" : ""}`}
      </Typography>

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong> Date </strong></TableCell>
              <TableCell><strong> Action </strong></TableCell>
              <TableCell><strong> Asset </strong></TableCell>
              <TableCell><strong> {`Price (${unit}/Asset)`} </strong></TableCell>
              <TableCell><strong> {`Value (${unit})`} </strong></TableCell>
              <TableCell><strong> Receive Date </strong></TableCell>
              <TableCell><strong> {`Receive Price (${unit}/Asset)`} </strong></TableCell>
              <TableCell><strong> {`Capital Change (${unit})`} </strong></TableCell>
              <TableCell><strong> {`Cumulative Change (${unit})`} </strong></TableCell>
              <TableCell><strong> {`Cumulative Income (${unit})`} </strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {taxes
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((row: TaxRow, i: number) => (
                <TableRow key={i}>
                  <TableCell> {row.date.replace("T", " ").replace(".000Z", "")} </TableCell>
                  <TableCell> {row.action} </TableCell>
                  <TableCell> {`${commify(row.amount)} ${row.asset}`} </TableCell>
                  <TableCell> {commify(row.price)} </TableCell>
                  <TableCell> {commify(row.value)} </TableCell>
                  <TableCell> {row.receiveDate.replace("T", " ").replace(".000Z", "")} </TableCell>
                  <TableCell> {commify(row.receivePrice)} </TableCell>
                  <TableCell> {commify(row.capitalChange)} </TableCell>
                  <TableCell> {commify(row.cumulativeChange)} </TableCell>
                  <TableCell> {commify(row.cumulativeIncome)} </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[25, 50, 100, 250]}
          component="div"
          count={taxes.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>
    </Paper>

  </>);
};