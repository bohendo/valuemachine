import DeleteIcon from "@mui/icons-material/Backspace";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { parseCsv } from "@valuemachine/transactions";
import {
  CsvFile,
  CsvFiles,
} from "@valuemachine/types";
import {
  hashCsv,
} from "@valuemachine/utils";
import React from "react";

type CsvTableProps = {
  csvFiles: CsvFiles,
  setCsvFiles: (val: CsvFiles) => void,
};
export const CsvTable: React.FC<CsvTableProps> = ({
  csvFiles,
  setCsvFiles,
}: CsvTableProps) => {

  const handleDelete = index =>
    setCsvFiles(csvFiles.slice(0, index).concat(csvFiles.slice(index + 1)));

  return (
    <Paper sx={{ p: 2 }}>
      <Typography align="center" variant="h4" sx={{ mb: 2 }} component="div">
        {`${csvFiles.length} CSV File${csvFiles.length === 1 ? "" : "s"}`}
      </Typography>
      {csvFiles.length ? (
        <TableContainer>
          <Table size="small" sx={{ p: 2, minWidth: "20em" }}>
            <TableHead>
              <TableRow>
                <TableCell><strong> File Name </strong></TableCell>
                <TableCell><strong> Source </strong></TableCell>
                <TableCell><strong> Transactions </strong></TableCell>
                <TableCell><strong> Digest </strong></TableCell>
                <TableCell sx={{ width: "3em" }}></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {csvFiles.map(csvFile => ({
                ...csvFile,
                txns: parseCsv(csvFile.data),
              })).map((csvFile: CsvFile, i) => (
                <TableRow key={i}>
                  <TableCell> {csvFile.name.toString()} </TableCell>
                  <TableCell> {csvFile.txns?.[0]?.sources?.[0] || "Unknown"} </TableCell>
                  <TableCell> {csvFile.txns?.length || 0} </TableCell>
                  <TableCell> {hashCsv(csvFile.data)} </TableCell>
                  <TableCell
                    sx={{ width: "3em" }}
                    onClick={() => handleDelete(i)}
                  >
                    <DeleteIcon/>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : null}
    </Paper>
  );
};
