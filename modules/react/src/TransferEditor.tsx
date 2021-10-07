import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
// import AddIcon from "@material-ui/icons/AddCircle";
// import Button from "@material-ui/core/Button";
import Grid from "@material-ui/core/Grid";
import Typography from "@material-ui/core/Typography";
import { Transfer, TransferCategories } from "@valuemachine/types";
import {
  getAccountError,
  getAmountError,
  getAssetError,
  getTransferError,
} from "@valuemachine/utils";
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

const getEmptyTransfer = (): Transfer => JSON.parse(JSON.stringify({
  amount: "",
  asset: "",
  category: TransferCategories.Noop,
  from: "",
  to: "",
}));

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
  const [modified, setModified] = useState(false);
  const classes = useStyles();

  /*
  const handleSave = () => {
    if (!newTransfer || !modified || error) return;
    setTransfer?.(newTransfer);
  };
  */

  useEffect(() => {
    if (!newTransfer || !modified || error) return;
    setTransfer?.(newTransfer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newTransfer, modified, error]);

  useEffect(() => {
    if (!transfer) setNewTransfer(getEmptyTransfer());
    else setNewTransfer(JSON.parse(JSON.stringify(transfer)) as Transfer);
  }, [transfer]);

  useEffect(() => {
    setError(newTransfer ? getTransferError(newTransfer) : "");
    if (!error) setTransfer?.(newTransfer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newTransfer]);

  useEffect(() => {
    if (!modified) setError("");
  }, [modified]);

  useEffect(() => {
    if (!transfer || !newTransfer) {
      setModified(false);
    } else if (
      newTransfer?.amount !== transfer?.amount ||
      newTransfer?.asset !== transfer?.asset ||
      newTransfer?.category !== transfer?.category ||
      newTransfer?.from !== transfer?.from ||
      newTransfer?.to !== transfer?.to
    ) {
      setModified(true);
    } else {
      setModified(false);
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
          getError={getAssetError}
          helperText={"Which type of asset was transferred?"}
          label="Asset"
          setText={asset => setNewTransfer({ ...newTransfer, asset })}
          text={newTransfer.asset}
        />
      </Grid>

      <Grid item md={4}>
        <TextInput 
          getError={getAmountError}
          helperText={"How much is this tx transferring"}
          label="Amount"
          setText={amount => setNewTransfer({ ...newTransfer, amount })}
          text={newTransfer.amount}
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
          getError={getAccountError}
          helperText={"Who recieved the transfer"}
          label="To"
          setText={to => setNewTransfer({ ...newTransfer, to })}
          text={newTransfer.to}
        />
      </Grid>

      <Grid item md={4}>
        <TextInput 
          getError={getAccountError}
          helperText={"Who sent the transfer"}
          label="From"
          setText={from => setNewTransfer({ ...newTransfer, from })}
          text={newTransfer.from}
        />
      </Grid>



      <Grid item md={6}>
        <Typography>
          {!modified ? "Enter transfer info" : (error || "Transfer looks good")}
        </Typography>
        {/*
        <Grid item>
          <Button
            className={classes.button}
            color="primary"
            disabled={!modified || !!error}
            onClick={handleSave}
            size="small"
            startIcon={<AddIcon />}
            variant="contained"
          >
            {error || "Save Transfer"}
          </Button>
        </Grid>
        */}
      </Grid>

    </Grid>
  </>);
};
