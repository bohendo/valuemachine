import DeleteIcon from "@mui/icons-material/Delete";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { CsvFiles, parseCsv } from "@valuemachine/transactions";
import React, { useState } from "react";

import { Confirm } from "../utils";

type CsvTableProps = {
  csvFiles: CsvFiles,
  setCsvFiles: (val: CsvFiles) => void,
};
export const CsvTable: React.FC<CsvTableProps> = ({
  csvFiles,
  setCsvFiles,
}: CsvTableProps) => {
  const [pendingRm, setPendingRm] = useState("");
  const [confirmMsg, setConfirmMsg] = useState("");

  const requestDelete = (key) => {
    console.log(`requesting ${key} deletion`);
    setPendingRm(key);
    setConfirmMsg(`Are you sure you want to delete ${csvFiles[key].name}?`);
  };

  const handleDelete = () => {
    if (!pendingRm) return;
    const newCsvFiles = { ...csvFiles }; // new object to ensure a re-render
    delete newCsvFiles[pendingRm];
    setCsvFiles(newCsvFiles);
    setPendingRm("");
    setConfirmMsg("");
  };

  const digests = Object.keys(csvFiles);

  return (<>
    <Paper sx={{ p: 2 }}>
      <Typography align="center" variant="h4" sx={{ mb: 2 }} component="div">
        {`${digests.length} CSV File${digests.length === 1 ? "" : "s"}`}
      </Typography>
      {digests.length ? (
        <TableContainer>
          <Table size="small" sx={{ minWidth: "20em", overflow: "auto" }}>
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
                    onClick={() => requestDelete(digest)}
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

    <Confirm message={confirmMsg} setMessage={setConfirmMsg} action={handleDelete} />

  </>);
};
