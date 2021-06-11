import { isAddress } from "@ethersproject/address";
import { getValueMachine } from "@finances/core";
import { AddressBook, ValueMachineJson } from "@finances/types";
import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import Divider from "@material-ui/core/Divider";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableRow from "@material-ui/core/TableRow";
import Typography from "@material-ui/core/Typography";
import React, { useEffect, useState } from "react";

import { HexString } from "./HexString";

const useStyles = makeStyles((theme: Theme) => createStyles({
  table: {
    margin: theme.spacing(1),
  },
  subTable: {
    margin: theme.spacing(0),
    "&:last-child th, &:last-child td": {
      borderBottom: 0,
    },
  },
  accounts: {
    maxWidth: "12em",
    "& > *": {
      marginRight: theme.spacing(0),
    },
  },
  assets: {
    width: "10em",
  },
}));

export const BalanceTable = ({
  balances,
}: {
  balances: { [asset: string]: string },
}) => {
  const classes = useStyles();
  return (
    <Table size="small">
      <TableBody>
        {Object.entries(balances).map(([asset, balance]: string[], i: number) => (
          <TableRow key={i} className={classes.subTable}>
            <TableCell className={classes.assets}> {asset} </TableCell>
            <TableCell> {balance} </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export const Dashboard: React.FC = ({
  addressBook,
  vmJson,
}: {
  addressBook: AddressBook;
  vmJson: ValueMachineJson;
}) => {
  const [allBalances, setAllBalances] = useState({});
  console.log(`We have ${addressBook?.addresses?.length} addresses`);
  console.log(vmJson);
  const classes = useStyles();

  useEffect(() => {
    if (!addressBook || !vmJson) return;
    const valueMachine = getValueMachine({ addressBook, json: vmJson });
    const accounts = valueMachine.getAccounts();
    setAllBalances(accounts.reduce((balances, account) => {
      balances[account] = valueMachine.getNetWorth(account);
      return balances;
    }, {}));
  }, [addressBook, vmJson]);

  return (<>

    <Typography variant="h3">
      Abstract Accounts
    </Typography>
    <Divider/>

    <Table size="small" className={classes.table}>
      <TableBody>
        {Object.entries(allBalances)
          .filter(([account, _balances]: string[]) => !isAddress(account))
          .map(([account, balances]: string[], i: number) => (
            <TableRow key={i}>
              <TableCell className={classes.accounts}>
                <Typography noWrap>
                  {account}
                </Typography>
              </TableCell>
              <TableCell>
                <BalanceTable balances={balances}/>
              </TableCell>
            </TableRow>
          ))
        }
      </TableBody>
    </Table>

    <Typography variant="h3">
      Ethereum Accounts
    </Typography>
    <Divider/>

    <Table size="small" className={classes.table}>
      <TableBody>
        {Object.entries(allBalances)
          .filter(([account, _balances]: string[]) => isAddress(account))
          .map(([account, balances]: string[], i: number) => (
            <TableRow key={i}>
              <TableCell className={classes.accounts}>
                <HexString
                  display={addressBook.getName(account)}
                  value={account}
                />
              </TableCell>
              <TableCell>
                <BalanceTable balances={balances}/>
              </TableCell>
            </TableRow>
          ))
        }
      </TableBody>
    </Table>
  </>);

};
