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
  CsvFiles,
} from "@valuemachine/types";
import React from "react";

type CsvTableProps = {
  csvFiles: CsvFiles,
  setCsvFiles: (val: CsvFiles) => void,
};
export const CsvTable: React.FC<CsvTableProps> = ({
  csvFiles,
  setCsvFiles,
}: CsvTableProps) => {

  const handleDelete = key => {
    const newCsvFiles = { ...csvFiles }; // new object to ensure a re-render
    delete newCsvFiles[key];
    setCsvFiles(newCsvFiles);
  };

  const digests = Object.keys(csvFiles);

  return (
    <Paper sx={{ p: 2 }}>
      <Typography align="center" variant="h4" sx={{ mb: 2 }} component="div">
        {`${digests.length} CSV File${digests.length === 1 ? "" : "s"}`}
      </Typography>
      {digests.length ? (
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
              {digests.map(digest => (
                <TableRow key={digest}>
                  <TableCell> {csvFiles[digest].name} </TableCell>
                  <TableCell> {csvFiles[digest].source || "Unknown"} </TableCell>
                  <TableCell> {parseCsv(csvFiles[digest].data)?.length || 0} </TableCell>
                  <TableCell> {digest} </TableCell>
                  <TableCell
                    sx={{ width: "3em" }}
                    onClick={() => handleDelete(digest)}
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
