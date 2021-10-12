import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableContainer from "@material-ui/core/TableContainer";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import { AddressBook, ValueMachine } from "@valuemachine/types";
import React, { useEffect, useState } from "react";
import { gt } from "@valuemachine/utils";

import { HexString } from "../utils";

import { Balances } from "./Balances";

const useStyles = makeStyles((theme: Theme) => createStyles({
  paper: {
    padding: theme.spacing(2),
  },
  table: {
    minWidth: theme.spacing(56),
    overflow: "auto",
    padding: theme.spacing(1),
  },
  accountCell: {
    marginRight: theme.spacing(2),
    paddingRight: theme.spacing(2),
  },
}));

type BalanceTableProps = {
  addressBook: AddressBook;
  vm: ValueMachine;
};
export const BalanceTable: React.FC<BalanceTableProps> = ({
  addressBook,
  vm,
}: BalanceTableProps) => {
  const [allBalances, setAllBalances] = useState({});
  const classes = useStyles();

  useEffect(() => {
    if (!addressBook || !vm) return;
    const accounts = vm.getAccounts();
    setAllBalances(accounts.reduce((balances, account) => {
      balances[account] = vm.getNetWorth(account);
      return balances;
    }, {}));
  }, [addressBook, vm]);

  return (<>

    <Paper className={classes.paper}>
      <TableContainer>
        <Table size="small" className={classes.table}>
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
                    <TableCell className={classes.accountCell}>
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
