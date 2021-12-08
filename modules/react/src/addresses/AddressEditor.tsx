import { isAddress } from "@ethersproject/address";
import { isHexString } from "@ethersproject/bytes";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import AddIcon from "@mui/icons-material/AddCircle";
import {
  AddressCategories,
  AddressEntry,
  PhysicalGuards,
} from "@valuemachine/transactions";
import React, { useEffect, useState } from "react";

import { SelectOne, TextInput } from "../utils";

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
    const illegal = name.match(/[^a-zA-Z0-9 ._-]/);
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
      newEntry.guard !== entry.guard ||
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
      sx={{ p: 2 }}
    >

      <Grid item md={4}>
        <TextInput
          getError={getNameError}
          label="Account Name"
          setText={name => setNewEntry({ ...newEntry, name })}
          text={newEntry.name}
        />
      </Grid>

      <Grid item md={4}>
        <SelectOne
          label="Category"
          choices={Object.keys(AddressCategories)}
          selection={newEntry?.category}
          setSelection={(category: any) => setNewEntry({ ...newEntry, category })}
        />
      </Grid>

      <Grid item md={4}>
        <SelectOne
          label="Guard"
          choices={Object.keys(PhysicalGuards)}
          selection={newEntry?.guard || ""}
          setSelection={guard => {
            if (guard) {
              setNewEntry({ ...newEntry, guard });
            } else {
              delete newEntry.guard;
              setNewEntry({ ...newEntry });
            }
          }}
        />
      </Grid>

      <Grid item md={8}>
        <TextInput
          getError={getAddressError}
          label="Evm Address"
          setText={address => setNewEntry({ ...newEntry, address })}
          text={newEntry.address}
        />
      </Grid>

      <Grid item md={4}>
        <Grid item>
          <Button
            sx={{ mt: 0.5, ml: 4 }}
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
