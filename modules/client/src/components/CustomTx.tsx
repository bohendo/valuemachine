import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import Button from "@material-ui/core/Button";
import FormControl from "@material-ui/core/FormControl";
import Grid from "@material-ui/core/Grid";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import Select from "@material-ui/core/Select";
import TextField from "@material-ui/core/TextField";
import AddIcon from "@material-ui/icons/AddCircle";
import { Methods } from "@valuemachine/transactions";
import { Transaction } from "@valuemachine/types";
import React, { useEffect, useState } from "react";

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

type TransactionEditorProps = {
  tx: Partial<Transaction>;
  setTx: (entry: Transaction) => void;
};
export const TransactionEditor: React.FC<TransactionEditorProps> = ({
  tx,
  setTx,
}: TransactionEditorProps) => {
  const [newTx, setNewTx] = useState({} as Partial<Transaction>);
  const [txModified, setTxModified] = useState(false);
  const [newTxError, setNewTxError] = useState("");
  const classes = useStyles();

  const getErrors = (candidate: Partial<Transaction>): string => {
    if (!candidate?.date) {
      return "Date is required";
    } else {
      return "";
    }
  };

  const handleTxChange = (event: React.ChangeEvent<{ name?: string; value: unknown; }>) => {
    const { name, value } = event.target;
    if (typeof name !== "string" || typeof value !== "string") return;
    const newNewTx = { ...newTx, [name]: value };
    setNewTx(newNewTx);
    setNewTxError(getErrors(newNewTx));
  };

  const handleSave = () => {
    if (!newTx) return;
    const errors = getErrors(newTx);
    if (!errors) {
      setTx(newTx as Transaction);
    } else {
      setNewTxError(errors);
    }
  };

  useEffect(() => {
    if (!tx) return;
    setNewTx(JSON.parse(JSON.stringify(tx)));
  }, [tx]);

  useEffect(() => {
    if (!txModified) {
      setNewTxError("");
    }
  }, [txModified]);

  useEffect(() => {
    if (!tx || !newTx) {
      setTxModified(false);
    } else if (
      newTx.date !== tx.date ||
      newTx.method !== tx.method
    ) {
      setTxModified(true);
    } else {
      setTxModified(false);
    }
  }, [newTx, tx]);

  return (
    <Grid
      alignContent="center"
      alignItems="center"
      container
      spacing={1}
      className={classes.grid}
    >

      <Grid item md={4}>
        <TextField
          autoComplete="off"
          value={newTx?.date || ""}
          helperText="When did this tx happen"
          id="name"
          fullWidth
          label="Transaction Date"
          margin="normal"
          name="name"
          onChange={handleTxChange}
          variant="outlined"
        />
      </Grid>

      <Grid item md={4}>
        <FormControl className={classes.select}>
          <InputLabel id="select-new-method">Method</InputLabel>
          <Select
            labelId={`select-${tx?.uuid}-method`}
            id={`select-${tx?.uuid}-method`}
            name="method"
            value={newTx?.method || ""}
            onChange={handleTxChange}
          >
            <MenuItem value={""}>-</MenuItem>
            {Object.keys(Methods).map((cat, i) => (
              <MenuItem key={i} value={cat}>{cat}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      <Grid item md={6}>
        <TextField
          className={classes.textInput}
          autoComplete="off"
          value={newTx?.uuid || ""}
          error={!!newTxError}
          helperText={newTxError || "Give this tx a universally unique ID"}
          id="uuid"
          fullWidth
          label="Transaction ID"
          margin="normal"
          name="uuid"
          onChange={handleTxChange}
          variant="outlined"
        />
      </Grid>

      <Grid item md={6}>
        {txModified ?
          <Grid item>
            <Button
              className={classes.button}
              color="primary"
              onClick={handleSave}
              size="small"
              startIcon={<AddIcon />}
              variant="contained"
            >
              Save Transaction
            </Button>
          </Grid>
          : undefined
        }
      </Grid>
    </Grid>
  );
};


