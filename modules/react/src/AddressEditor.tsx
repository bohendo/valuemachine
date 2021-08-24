import { isAddress } from "@ethersproject/address";
import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import Button from "@material-ui/core/Button";
import FormControl from "@material-ui/core/FormControl";
import Grid from "@material-ui/core/Grid";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import Select from "@material-ui/core/Select";
import TextField from "@material-ui/core/TextField";
import AddIcon from "@material-ui/icons/AddCircle";
import {
  AddressCategories,
  AddressEntry,
} from "@valuemachine/types";
import React, { useEffect, useState } from "react";

const useStyles = makeStyles((theme: Theme) => createStyles({
  root: {
    margin: theme.spacing(1),
    maxWidth: "98%",
  },
  divider: {
    marginBottom: theme.spacing(2),
    marginTop: theme.spacing(2),
  },
  select: {
    margin: theme.spacing(3),
    minWidth: 160,
  },
  input: {
    margin: theme.spacing(1),
    minWidth: 120,
    maxWidth: 300,
  },
  exporter: {
    marginBottom: theme.spacing(4),
    marginLeft: theme.spacing(4),
    marginRight: theme.spacing(4),
    marginTop: theme.spacing(0),
  },
  importer: {
    marginBottom: theme.spacing(1),
    marginLeft: theme.spacing(4),
    marginRight: theme.spacing(4),
    marginTop: theme.spacing(0),
  },
  syncing: {
    marginTop: theme.spacing(4),
    marginLeft: theme.spacing(4),
    marginRight: theme.spacing(4),
  },
  snackbar: {
    width: "100%"
  },
  button: {
    marginBottom: theme.spacing(1.5),
    marginLeft: theme.spacing(2),
    marginRight: theme.spacing(2),
  },
  title: {
    margin: theme.spacing(2),
  },
  subtitle: {
    margin: theme.spacing(2),
  },
  deleteAll: {
    margin: theme.spacing(2),
  },
  paper: {
    padding: theme.spacing(2),
  },
  table: {
    minWidth: "600px",
    padding: theme.spacing(2),
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

  useEffect(() => {
    if (!entry) return;
    setNewEntry(JSON.parse(JSON.stringify(entry)));
  }, [entry]);

  useEffect(() => {
    if (!entryModified) {
      setNewEntryError("");
    }
  }, [entryModified]);

  const getErrors = (candidate: Partial<AddressEntry>): string => {
    console.log(`Checking ${addresses.length} addresses for dups.. first few: ${addresses.slice(0, 2)}`);
    if (!candidate?.address) {
      return "Address is required";
    } else if (!isAddress(candidate.address)) {
      return "Invalid address";
    } else if (addresses?.includes(candidate.address)) {
      return `Address ${
        candidate.address.substring(0,6)
      }..${
        candidate.address.substring(candidate.address.length-4)
      } already exists`;
    } else {
      return "";
    }
  };

  const handleEntryChange = (event: React.ChangeEvent<{ name?: string; value: unknown; }>) => {
    const { name, value } = event.target;
    if (typeof name !== "string" || typeof value !== "string") return;
    const newNewEntry = { ...newEntry, [name]: value };
    setNewEntry(newNewEntry);
    setNewEntryError(getErrors(newNewEntry));
  };

  useEffect(() => {
    if (!addresses?.length || !entryModified) return;
    setNewEntryError(getErrors(newEntry) || "");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addresses]);

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

  const handleSave = () => {
    if (!newEntry) return;
    const errors = getErrors(newEntry);
    if (!errors) {
      setEntry(newEntry as AddressEntry);
    } else {
      setNewEntryError(errors);
    }
  };

  return (
    <>

      <Grid
        alignContent="center"
        alignItems="center"
        container
        spacing={1}
        className={classes.root}
      >

        <Grid item md={4}>
          <TextField
            autoComplete="off"
            value={newEntry?.name || ""}
            helperText="Give your account a nickname"
            id="name"
            fullWidth
            label="Account Name"
            margin="normal"
            name="name"
            onChange={handleEntryChange}
            variant="outlined"
          />
        </Grid>

        <Grid item md={4}>
          <FormControl className={classes.select}>
            <InputLabel id="select-new-category">Category</InputLabel>
            <Select
              labelId={`select-${entry?.address}-category`}
              id={`select-${entry?.address}-category`}
              name="category"
              value={newEntry?.category || ""}
              onChange={handleEntryChange}
            >
              <MenuItem value={""}>-</MenuItem>
              {Object.keys(AddressCategories).map((cat, i) => (
                <MenuItem key={i} value={cat}>{cat}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item md={6}>
          <TextField
            autoComplete="off"
            value={newEntry?.address || ""}
            error={!!newEntryError}
            helperText={newEntryError || "Add your ethereum address to fetch info"}
            id="address"
            fullWidth
            label="Eth Address"
            margin="normal"
            name="address"
            onChange={handleEntryChange}
            variant="outlined"
          />
        </Grid>

        <Grid item md={6}>
          {entryModified ?
            <Grid item>
              <Button
                className={classes.button}
                color="primary"
                onClick={handleSave}
                size="small"
                startIcon={<AddIcon />}
                variant="contained"
              >
                Save Address
              </Button>
            </Grid>
            : undefined
          }
        </Grid>
      </Grid>

    </>
  );
};
