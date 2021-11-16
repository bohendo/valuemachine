import Paper from "@mui/material/Paper";
import Grid from "@mui/material/Grid";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import {
  securityFeeMap,
  getTaxYearBoundaries,
} from "@valuemachine/taxes";
import {
  Assets,
} from "@valuemachine/transactions";
import {
  Asset,
  Guard,
  TaxActions,
  TaxRow,
  TaxRows,
  TxTags,
} from "@valuemachine/types";
import { dedup } from "@valuemachine/utils";
import React, { useEffect, useState } from "react";

import { Paginate, SelectOne } from "../utils";

import { TaxTableRow } from "./TaxTableRow";

type TaxTableProps = {
  guard: Guard;
  setTxTags: (val: TxTags) => void;
  taxRows: TaxRows;
  txTags: TxTags;
  unit?: Asset;
};
export const TaxTable: React.FC<TaxTableProps> = ({
  guard,
  setTxTags,
  txTags,
  taxRows,
  unit: userUnit,
}: TaxTableProps) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(25);
  const [unit, setUnit] = React.useState(userUnit || Assets.ETH);
  const [filterAction, setFilterAction] = useState("");
  const [filterTaxYear, setFilterTaxYear] = useState("");
  const [filteredRows, setFilteredRows] = useState([] as TaxRow[]);

  useEffect(() => {
    setFilteredRows(taxRows.filter(row => (
      !filterAction || row.action === filterAction
    ) && (
      !filterTaxYear || (
        new Date(row.date).getTime() >= getTaxYearBoundaries(guard, filterTaxYear)[0] &&
        new Date(row.date).getTime() <= getTaxYearBoundaries(guard, filterTaxYear)[1]
      )
    )));
  }, [guard, filterAction, filterTaxYear, taxRows]);

  useEffect(() => {
    setUnit(securityFeeMap[guard] || userUnit);
  }, [guard, userUnit]);

  return (<>
    <Paper sx={{ p: 2 }}>

      <Grid container>
        <Grid item xs={12}>
          <Typography align="center" variant="h4" sx={{ p: 2 }} component="div">
            {filteredRows.length === taxRows?.length
              ? `${filteredRows.length} Taxable Event${filteredRows.length === 1 ? "" : "s"}`
              : `${filteredRows.length} of ${taxRows?.length} Taxable Events`
            }

          </Typography>
        </Grid>

        <Grid item>
          <SelectOne
            label="Filter Action"
            choices={Object.keys(TaxActions)}
            selection={filterAction}
            setSelection={setFilterAction}
          />
        </Grid>

        <Grid item>
          <SelectOne
            label="Filter Tax Year"
            choices={dedup(taxRows.reduce(
              (years, row) => ([...years, row.date.substring(0, 4)]),
              [] as string[],
            ))}
            selection={filterTaxYear}
            setSelection={setFilterTaxYear}
          />
        </Grid>
      </Grid>

      <TableContainer>
        <Table size="small" sx={{ minWidth: "64em", overflow: "auto" }}>
          <TableHead>
            <TableRow>
              <TableCell><strong> Expand </strong></TableCell>
              <TableCell sx={{ minWidth: "8em" }}><strong> Date </strong></TableCell>
              <TableCell><strong> Action </strong></TableCell>
              <TableCell><strong> Asset </strong></TableCell>
              <TableCell><strong> {`Price (${unit}/Asset)`} </strong></TableCell>
              <TableCell><strong> {`Value (${unit})`} </strong></TableCell>
              <TableCell sx={{ minWidth: "8em" }}><strong> Receive Date </strong></TableCell>
              <TableCell><strong> {`Receive Price (${unit}/Asset)`} </strong></TableCell>
              <TableCell><strong> {`Capital Change (${unit})`} </strong></TableCell>
              <TableCell><strong> {`Type`} </strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredRows
              .sort((r1, r2) =>
                new Date(r1.date).getTime() > new Date(r2.date).getTime()
                  ? -1
                  : new Date(r1.date).getTime() < new Date(r2.date).getTime()
                    ? 1
                    : 0
              )
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((row: TaxRow, i: number) => (
                <TaxTableRow
                  key={i}
                  row={row}
                  setTxTags={setTxTags}
                  txId={row.txId}
                  txTags={txTags}
                  unit={unit}
                />
              ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Paginate
        count={filteredRows.length}
        page={page}
        rowsPerPage={rowsPerPage}
        setPage={setPage}
        setRowsPerPage={setRowsPerPage}
      />
    </Paper>
  </>);
};
