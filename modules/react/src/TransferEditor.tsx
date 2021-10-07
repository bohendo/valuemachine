import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import Button from "@material-ui/core/Button";
import Grid from "@material-ui/core/Grid";
import AddIcon from "@material-ui/icons/AddCircle";
import { Transfer, TransferCategories } from "@valuemachine/types";
import { getAmountError, getTransferError } from "@valuemachine/utils";
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
  button: {
    marginBottom: theme.spacing(1.5),
    marginLeft: theme.spacing(2),
    marginRight: theme.spacing(2),
  },
}));

const getEmptyTransfer = (): Transfer => ({
  amount: "",
  asset: "",
  category: TransferCategories.Noop,
  from: "",
  to: "",
} as Transfer);

type TransferEditorProps = {
  transfer?: Transfer;
  setTransfer?: (transfer: Transfer) => void;
};
export const TransferEditor: React.FC<TransferEditorProps> = ({
  transfer,
  setTransfer,
}: TransferEditorProps) => {
  const [newTransfer, setNewTransfer] = useState(getEmptyTransfer());
  const [error, setError] = useState("");
  const [txModified, setTxModified] = useState(false);
  const classes = useStyles();

  const handleSave = () => {
    if (!newTransfer || !txModified || error) return;
    setTransfer?.(newTransfer);
  };

  useEffect(() => {
    if (!transfer) return;
    setNewTransfer(JSON.parse(JSON.stringify(transfer)) as Transfer);
  }, [transfer]);

  useEffect(() => {
    setError(getTransferError(newTransfer));
  }, [newTransfer]);

  useEffect(() => {
    if (!txModified) setError("");
  }, [txModified]);

  useEffect(() => {
    if (!newTransfer) {
      setTxModified(false);
    } else if (
      newTransfer?.amount !== transfer?.amount ||
      newTransfer?.asset !== transfer?.asset ||
      newTransfer?.category !== transfer?.category ||
      newTransfer?.from !== transfer?.from ||
      newTransfer?.to !== transfer?.to
    ) {
      setTxModified(true);
    } else {
      setTxModified(false);
    }
  }, [newTransfer, transfer]);

  return (<>
    <Grid
      alignContent="center"
      alignItems="center"
      container
      spacing={1}
      className={classes.grid}
    >

      <Grid item md={4}>
        <TextInput 
          label="Asset"
          helperText={"Which type of asset was transferred?"}
          setText={asset => setNewTransfer({ ...newTransfer, asset })}
          getError={() => ""}
        />
      </Grid>

      <Grid item md={4}>
        <TextInput 
          label="Amount"
          helperText={"How much is this tx transferring"}
          setText={amount => setNewTransfer({ ...newTransfer, amount })}
          getError={getAmountError}
        />
      </Grid>

      <Grid item md={4}>
        <SelectOne 
          label="Category"
          choices={Object.keys(TransferCategories)}
          selection={newTransfer.category}
          setSelection={category => setNewTransfer({
            ...newTransfer,
            category: TransferCategories[category],
          })}
        />
      </Grid>

      <Grid item md={4}>
        <TextInput 
          label="To"
          helperText={"Who recieved the transfer"}
          setText={to => setNewTransfer({ ...newTransfer, to })}
          getError={() => ""}
        />
      </Grid>

      <Grid item md={4}>
        <TextInput 
          label="From"
          helperText={"Who sent the transfer"}
          setText={from => setNewTransfer({ ...newTransfer, from })}
          getError={() => ""}
        />
      </Grid>

      <Grid item md={6}>
        <Grid item>
          <Button
            className={classes.button}
            color="primary"
            disabled={!!error}
            onClick={handleSave}
            size="small"
            startIcon={<AddIcon />}
            variant="contained"
          >
            {error || "Save Transfer"}
          </Button>
        </Grid>
      </Grid>
    </Grid>
  </>);
};
