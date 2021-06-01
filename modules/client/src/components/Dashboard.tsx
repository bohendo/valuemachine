import { getState } from "@finances/core";
import { AddressBook, StateJson } from "@finances/types";
import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import React, { useEffect, useState } from "react";

import { HexString } from "./HexString";

const useStyles = makeStyles((theme: Theme) => createStyles({
  table: {
    margin: theme.spacing(1),
  },
  accounts: {
    maxWidth: "10em",
  },
  assets: {
    width: "10em",
  },
}));

////////////////////////////////////////
// Dashboard
export const Dashboard: React.FC = ({
  addressBook,
  state,
}: {
  addressBook: AddressBook;
  state: StateJson;
}) => {
  const [balances, setBalances] = useState({});
  console.log(`We have ${addressBook?.addresses?.length} addresses`);
  console.log(state);
  const classes = useStyles();

  useEffect(() => {
    if (!addressBook || !state) return;
    setBalances(getState({ addressBook, stateJson: state }).getAllBalances());
  }, [addressBook, state]);

  return (
    <Table size="small" className={classes.table}>
      <TableHead>
        <TableRow>
          <TableCell className={classes.accounts}><strong> Account </strong></TableCell>
          <TableCell><strong> Balances </strong></TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {Object.entries(balances).map(([account, assets]: string[], i: number) => (
          <TableRow key={i}>
            <TableCell className={classes.accounts}>
              <HexString
                display={addressBook.getName(account)}
                value={account}
              />
            </TableCell>
            <TableCell>

              <Table size="small">
                <TableBody>
                  {Object.entries(assets).map(([asset, balance]: string[], i: number) => (
                    <TableRow key={i}>
                      <TableCell className={classes.assets}> {asset} </TableCell>
                      <TableCell> {balance} </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>


            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
