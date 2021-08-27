import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableContainer from "@material-ui/core/TableContainer";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import Typography from "@material-ui/core/Typography";
import {
  CsvFiles,
} from "@valuemachine/types";
import React from "react";

const useStyles = makeStyles((theme: Theme) => createStyles({
  paper: {
    padding: theme.spacing(2),
  },
  title: {
    marginBottom: theme.spacing(2),
  },
  table: {
    minWidth: "200px",
    padding: theme.spacing(2),
  },
}));

type CsvTableProps = {
  csvFiles: CsvFiles,
};
export const CsvTable: React.FC<CsvTableProps> = ({
  csvFiles,
}: CsvTableProps) => {
  const classes = useStyles();

  return (
    <Paper className={classes.paper}>
      <Typography align="center" variant="h4" className={classes.title} component="div">
        {`${csvFiles.length} CSV File${csvFiles.length === 1 ? "" : "s"}`}
      </Typography>
      {csvFiles.length ? (
        <TableContainer>
          <Table size="small" className={classes.table}>
            <TableHead>
              <TableRow>
                <TableCell><strong> File Name </strong></TableCell>
                <TableCell><strong> File Type </strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {csvFiles.map((csvFile: { name: string; type: string; data: string }, i) => (
                <TableRow key={i}>
                  <TableCell> {csvFile.name.toString()} </TableCell>
                  <TableCell> {csvFile.type.toString()} </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : null}
    </Paper>
  );
};
