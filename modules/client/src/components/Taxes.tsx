import {
  AddressBook,
  Assets,
  EventTypes,
  Events,
  Fiat,
  TransferCategories,
} from "@finances/types";
import { getJurisdiction } from "@finances/utils";
import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import Divider from "@material-ui/core/Divider";
import FormControl from "@material-ui/core/FormControl";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import Paper from "@material-ui/core/Paper";
import Select from "@material-ui/core/Select";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableContainer from "@material-ui/core/TableContainer";
import TableHead from "@material-ui/core/TableHead";
import TablePagination from "@material-ui/core/TablePagination";
import TableRow from "@material-ui/core/TableRow";
import Typography from "@material-ui/core/Typography";
import React, { useEffect, useState } from "react";

import { EventRow } from "./ValueMachine";

const useStyles = makeStyles((theme: Theme) => createStyles({
  root: {
    margin: theme.spacing(1),
  },
  select: {
    margin: theme.spacing(3),
    minWidth: 160,
  },
}));

export const TaxesExplorer = ({
  addressBook,
  events,
  unit,
}: {
  addressBook: AddressBook;
  events: Events,
  unit: Assets;
}) => {
  const classes = useStyles();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(25);
  const [allJurisdictions, setAllJurisdictions] = useState([]);
  const [jurisdiction, setJurisdiction] = React.useState(0);
  const [taxes, setTaxes] = React.useState([] as Events);

  useEffect(() => {
    const newJurisdictions = Array.from(events
      .filter(e => e.type === EventTypes.JurisdictionChange)
      .reduce((all, cur) => {
        all.add(cur.oldJurisdiction);
        all.add(cur.newJurisdiction);
        return all;
      }, new Set())
    ).sort((j1, j2) => j2 > j1 ? 1 : -1).sort((j1, j2) =>
      !Object.keys(Fiat).includes(j1) && Object.keys(Fiat).includes(j2) ? 1 : -1
    );
    setAllJurisdictions(newJurisdictions);
    setJurisdiction(newJurisdictions[0]);
  }, [events]);

  useEffect(() => {
    setTaxes(
      events.filter(evt => {
        const toJur = getJurisdiction(evt.to);
        const fromJur = getJurisdiction(evt.from);
        return (
          evt.type === EventTypes.Trade
          || evt.type === EventTypes.JurisdictionChange
          || (evt.type === EventTypes.Transfer && evt.category === TransferCategories.Income)
        ) && (
          jurisdiction === toJur || jurisdiction === fromJur
        );
      })
    );
  }, [jurisdiction, events]);

  const handleJurisdictionChange = (event: React.ChangeEvent<{ value: string }>) => {
    setJurisdiction(event.target.value);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  return (
    <>
      <Typography variant="h3">
        Taxes Explorer
      </Typography>
      <Divider/>

      <Typography variant="body1" className={classes.root}>
        Security provided by: {allJurisdictions.join(", ")}
      </Typography>

      <FormControl className={classes.select}>
        <InputLabel id="select-jurisdiction">Jurisdication</InputLabel>
        <Select
          labelId="select-jurisdiction"
          id="select-jurisdiction"
          value={jurisdiction || ""}
          onChange={handleJurisdictionChange}
        >
          <MenuItem value={""}>-</MenuItem>
          {allJurisdictions?.map((jur, i) => <MenuItem key={i} value={jur}>{jur}</MenuItem>)}
        </Select>
      </FormControl>

      <Typography>
        Found {taxes.length} taxable events
      </Typography>

      <Paper className={classes.paper}>

        <Typography align="center" variant="h4" className={classes.title} component="div">
          {taxes.length === events.length
            ? `${taxes.length} Events`
            : `${taxes.length} of ${events.length} Events`
          }
        </Typography>

        <TableContainer>
          <TablePagination
            rowsPerPageOptions={[25, 50, 100, 250]}
            component="div"
            count={taxes.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onChangePage={handleChangePage}
            onChangeRowsPerPage={handleChangeRowsPerPage}
          />
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong> Date </strong></TableCell>
                <TableCell><strong> Type </strong></TableCell>
                <TableCell><strong> Description </strong></TableCell>
                <TableCell><strong> Details </strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {taxes
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((event: Events, i: number) => (
                  <EventRow addressBook={addressBook} key={i} event={event} unit={unit} />
                ))}
            </TableBody>
          </Table>
          <TablePagination
            rowsPerPageOptions={[25, 50, 100, 250]}
            component="div"
            count={taxes.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onChangePage={handleChangePage}
            onChangeRowsPerPage={handleChangeRowsPerPage}
          />
        </TableContainer>
      </Paper>

    </>
  );
};
