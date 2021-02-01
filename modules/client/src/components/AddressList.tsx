import React, { useCallback, useContext, useEffect, useState } from "react";
import {
  TableCell,
  TableHead,
  TableBody,
  Table,
  Paper,
  TableContainer,
  TableRow,
  IconButton,
  Theme,
  makeStyles,
  createStyles,
} from "@material-ui/core";
import {
  RemoveCircle as RemoveIcon,
} from "@material-ui/icons";
import { AddressEntry, } from "@finances/types";
import { AccountContext } from "../accountContext";

const useStyles = makeStyles((theme: Theme) => createStyles({
    root: {
      margin: theme.spacing(1),
    },
}));

export const AddressList = (props: any) => {
  const classes = useStyles();

  const accountContext = useContext(AccountContext);
  const { setProfile } = props;

  const deleteAddress = (entry: AddressEntry) => {
    console.log(`Deleting ${JSON.stringify(entry)}`);
    const newProfile = {...accountContext.profile, addressBook: [...accountContext.profile.addressBook]}
    let i = newProfile.addressBook.findIndex((o) => o.address.toLowerCase() === entry.address.toLowerCase())
    if (i >= 0) {
      newProfile.addressBook.splice(i,1)
      setProfile(newProfile);
    }
  };

  return (
    <TableContainer className={classes.root} component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell> Eth Address </TableCell>
            <TableCell> Account name </TableCell>
            <TableCell> Category </TableCell>
            <TableCell> Action </TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          { accountContext.profile.addressBook.map((entry: AddressEntry, i: number) => {
              return (
                <TableRow key={i}>
                  <TableCell> {entry.address} </TableCell>
                  <TableCell> {entry.name} </TableCell>
                  <TableCell> {entry.category} </TableCell>
                  <TableCell>
                    <IconButton color="secondary" onClick={() => deleteAddress(entry)}>
                      <RemoveIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              )
          })}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
