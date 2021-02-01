import React, { useCallback, useContext, useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  TextField,
  IconButton,
  Theme,
  makeStyles,
  createStyles,
} from "@material-ui/core"
import { AddCircle as AddIcon } from "@material-ui/icons";
import { AddressEntry } from "@finances/types";
import { AccountContext } from "../accountContext";

const useStyles = makeStyles((theme: Theme) => createStyles({
  root: {
    margin: theme.spacing(1),
  },
}));

export const AddNewAddress = (props: any) => {
  const [newAddressEntry, setNewAddressEntry] = useState({ category: "Self", name: "hot-wallet", } as AddressEntry);
  const [newEntryError, setNewEntryError] = useState({ err: false, msg: "Add your ethereum address to fetch info"});

  const { setProfile } = props;
  const accountContext = useContext(AccountContext);

  const classes = useStyles();

  const handleChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setNewAddressEntry({...newAddressEntry, [event.target.name]: event.target.value});
    setNewEntryError({err: false, msg: "Add your ethereum address to fetch info"})
  };

  const addNewAddress = () => {
    if (!newAddressEntry.address) {
      setNewEntryError({err: true, msg: "Required! Ethereum Address"})
    } else {
      let i = accountContext.profile.addressBook.findIndex(
        (o) => o.address.toLowerCase() === newAddressEntry.address.toLowerCase()
      );
      if (i < 0) {
        const newProfile = {...accountContext.profile, addressBook: [...accountContext.profile.addressBook, newAddressEntry]}
        setProfile(newProfile);
      } else {
        setNewEntryError({err: true, msg: "Address already added"})
      }
    }
  };

  return (
    <Card className={classes.root}>
      <CardHeader title={"Add new Address"} />
      <TextField
        error={newEntryError.err}
        id="address"
        label="Eth Address"
        defaultValue="0xabc..."
        helperText={newEntryError.msg}
        name="address"
        onChange={handleChange}
        margin="normal"
        variant="outlined"
      />
      <TextField
        id="name"
        label="Account Name"
        defaultValue="hot-wallet"
        helperText="Give your account a nickname"
        name="name"
        onChange={handleChange}
        margin="normal"
        variant="outlined"
      />
      <IconButton onClick={addNewAddress} >
        <AddIcon />
      </IconButton>
    </Card>
  )
}

