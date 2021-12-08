import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableRow from "@mui/material/TableRow";
import { Balances } from "@valuemachine/types";
import React from "react";

export const BalanceDisplay = ({
  balances,
}: {
  balances: Balances,
}) => {
  return (<>
    <TableContainer>
      <Table size="small" sx={{ minWidth: "20em", overflow: "auto", p: 2 }}>
        <TableBody>
          {Object.entries(balances).sort().map(([asset, bal]: string[], i: number) => (
            <TableRow  key={i} sx={{ m: 0, ["&>td"]: { borderBottom: 0 } }}>
              <TableCell sx={{ width: "12em", overflow: "hidden" }}> {asset} </TableCell>
              <TableCell> {bal} </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </>);
};
