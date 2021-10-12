import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableContainer from "@material-ui/core/TableContainer";
import TableRow from "@material-ui/core/TableRow";
import React from "react";

const useStyles = makeStyles((theme: Theme) => createStyles({
  table: {
    minWidth: theme.spacing(48),
    overflow: "auto",
    padding: theme.spacing(2),
  },
  row: {
    margin: theme.spacing(0),
    "&:last-child th, &:last-child td": {
      borderBottom: 0,
    },
  },
  assetColumn: {
    maxWidth: theme.spacing(24),
    minWidth: theme.spacing(24),
    width: theme.spacing(24),
    overflow: "hidden",
  },
  balanceColumn: {
    minWidth: theme.spacing(24),
    overflow: "hidden",
  },
}));

export const Balances = ({
  balances,
}: {
  balances: { [asset: string]: string },
}) => {
  const classes = useStyles();
  return (<>

    <TableContainer>
      <Table size="small" className={classes.table}>
        <TableBody>
          {Object.entries(balances).sort().map(([asset, bal]: string[], i: number) => (
            <TableRow  key={i} className={classes.row}>
              <TableCell className={classes.assetColumn}> {asset} </TableCell>
              <TableCell> {bal} </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>

  </>);
};
