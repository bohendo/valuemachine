import { isAddress } from "@ethersproject/address";
import { isHexString } from "@ethersproject/bytes";
import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import Button from "@material-ui/core/Button";
import Grid from "@material-ui/core/Grid";
import AddIcon from "@material-ui/icons/AddCircle";
import {
  AddressCategories,
  AddressEntry,
} from "@valuemachine/types";
import React, { useEffect, useState } from "react";

import { SelectOne } from "./SelectOne";
import { TextInput } from "./TextInput";

const useStyles = makeStyles((theme: Theme) => createStyles({
  grid: {
    margin: theme.spacing(1),
  },
  textInput: {
    margin: theme.spacing(1),
  },
  select: {
    margin: theme.spacing(3),
    minWidth: theme.spacing(15),
  },
  button: {
    marginBottom: theme.spacing(1.5),
    marginLeft: theme.spacing(2),
    marginRight: theme.spacing(2),
  },
}));

type AddressEditorProps = {
  entry: Partial<AddressEntry>;
  setEntry: (entry: AddressEntry) => void;
  addresses: string[];
};
export const AddressEditor: React.FC<AddressEditorProps> = ({
  entry,
  setEntry,
  addresses,
}: AddressEditorProps) => {
  const [newEntry, setNewEntry] = useState({} as Partial<AddressEntry>);
  const [entryModified, setEntryModified] = useState(false);
  const [newEntryError, setNewEntryError] = useState("");
  const classes = useStyles();

  console.log(newEntry);

  const getAddressError = (address?: string): string => {
    if (!address) {
      return "Address is required";
    } else if (!isHexString(address)) {
      return "Invalid hex string";
    } else if (address.length !== 42) {
      return "Invalid length";
    } else if (!isAddress(address)) {
      return "Invalid checksum";
    } else if (addresses?.includes(address)) {
      return `Address ${
        address.substring(0,6)
      }..${
        address.substring(address.length-4)
      } already exists`;
    } else {
      return "";
    }
  };

  const getNameError = (name?: string): string => {
    if (!name) {
      return "Name is required";
    }
    const illegal = name.match(/[^a-zA-Z0-9 -]/);
    if (illegal) {
      return `Name should not include "${illegal}"`;
    } else {
      return "";
    }
  };

  const getErrors = (candidate: Partial<AddressEntry>): string => {
    return getAddressError(candidate.address)
      || getNameError(candidate.name)
      || (!candidate.category ? "Category is required" : "");
  };

  const handleSave = () => {
    if (!newEntry || newEntryError) return;
    setEntry(newEntry as AddressEntry);
  };

  useEffect(() => {
    if (!entry) return;
    setNewEntry(JSON.parse(JSON.stringify(entry)));
  }, [entry]);

  useEffect(() => {
    if (!entryModified) {
      setNewEntryError("");
    } else {
      setNewEntryError(getErrors(newEntry));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addresses, entryModified, newEntry]);

  useEffect(() => {
    if (!entry || !newEntry) {
      setEntryModified(false);
    } else if (
      newEntry.address !== entry.address ||
      newEntry.category !== entry.category ||
      newEntry.name !== entry.name
    ) {
      setEntryModified(true);
    } else {
      setEntryModified(false);
    }
  }, [newEntry, entry]);

  return (
    <Grid
      alignContent="center"
      alignItems="center"
      container
      spacing={1}
      className={classes.grid}
    >

      <Grid item md={4}>
        <TextInput
          label="Account Name"
          setText={name => setNewEntry({ ...newEntry, name })}
          getError={getNameError}
        />
      </Grid>

      <Grid item md={4}>
        <SelectOne
          label="Category"
          choices={Object.keys(AddressCategories)}
          selection={newEntry?.category}
          setSelection={category => setNewEntry({ ...newEntry, category })}
        />
      </Grid>

      <Grid item md={6}>
        <TextInput
          label="Evm Address"
          setText={address => setNewEntry({ ...newEntry, address })}
          getError={getAddressError}
          fullWidth={true}
        />
      </Grid>

      <Grid item md={6}>
        <Grid item>
          <Button
            className={classes.button}
            color="primary"
            disabled={!entryModified || !!newEntryError}
            onClick={handleSave}
            size="small"
            startIcon={<AddIcon />}
            variant="contained"
          >
            {newEntryError || "Save Address"}
          </Button>
        </Grid>
      </Grid>
    </Grid>
  );
};
