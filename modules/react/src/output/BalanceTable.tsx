import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import { AddressBook, ValueMachine } from "@valuemachine/types";
import React, { useEffect, useState } from "react";
import { gt } from "@valuemachine/utils";

import { HexString } from "../utils";

import { Balances } from "./Balances";

type BalanceTableProps = {
  addressBook: AddressBook;
  vm: ValueMachine;
};
export const BalanceTable: React.FC<BalanceTableProps> = ({
  addressBook,
  vm,
}: BalanceTableProps) => {
  const [allBalances, setAllBalances] = useState({});

  useEffect(() => {
    if (!addressBook || !vm) return;
    const accounts = vm.getAccounts();
    setAllBalances(accounts.reduce((balances, account) => {
      balances[account] = vm.getNetWorth(account);
      return balances;
    }, {}));
  }, [addressBook, vm]);

  return (<>

    <Paper sx={{ p: 2 }}>
      <TableContainer>
        <Table size="small" sx={{ p: 1, overflow: "auto", minWidth: "32em" }}>
          <TableHead>
            <TableRow>
              <TableCell><strong> Account  </strong></TableCell>
              <TableCell><strong> Balances </strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.entries(allBalances)
              .sort((e1, e2) => e1[0] > e2[0] ? 1 : -1)
              .map(([account, balances]: any, i: number) =>
                Object.values(balances).some(bal => gt(bal, "0")) ? (
                  <TableRow key={i}>
                    <TableCell sx={{ mr: 2, pr: 2 }}>
                      <HexString value={account} display={addressBook.getName(account, true)}/>
                    </TableCell>
                    <TableCell>
                      <Balances balances={balances}/>
                    </TableCell>
                  </TableRow>
                ) : null)
            }
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>

  </>);
};
