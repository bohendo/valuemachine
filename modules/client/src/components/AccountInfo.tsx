import React, { useCallback, useContext, useEffect, useState } from "react";

import axios from "axios";
import {
  Button,
  Card,
  CardHeader,
  CircularProgress,
  Divider,
  FormControl,
  FormHelperText,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Theme,
  Typography,
  createStyles,
  makeStyles,
} from '@material-ui/core';
import {
  AddCircle as AddIcon,
  Delete as DeleteIcon,
  Sync as SyncIcon,
  RemoveCircle as RemoveIcon,
  Save as SaveIcon,
} from "@material-ui/icons";
import { Alert } from "@material-ui/lab";
import {
  Address,
  AddressEntry,
  emptyProfile,
} from "@finances/types";
import { getEthTransactionError } from "@finances/core";

import { AccountContext } from "../accountContext";
import { AddNewAddress } from "./AddNewAddress";

const useStyles = makeStyles((theme: Theme) => createStyles({
  root: {
    margin: theme.spacing(1),
  },
  input: {
    margin: theme.spacing(1),
    minWidth: 120,
    maxWidth: 300,
  },
  snackbar: {
    width: "100%"
  },
}));

const AddressList = (props: any) => {
  const classes = useStyles();

  const accountContext = useContext(AccountContext);
  const { setStatusAlert} = props;
  const [syncing, setSyncing] = useState({} as { [string]: boolean});

  const deleteAddress = (entry: AddressEntry) => {
    console.log(`Deleting ${JSON.stringify(entry)}`);
    const newProfile = {...accountContext.profile, addressBook: [...accountContext.profile.addressBook]}
    let i = newProfile.addressBook.findIndex((o) => o.address.toLowerCase() === entry.address.toLowerCase())
    if (i >= 0) {
      newProfile.addressBook.splice(i,1)
      //accountContext.setProfile(newProfile);
    }
  };

  const syncHistory = async (address: Address) => {
    setSyncing({ ...syncing, [address]: true });
    const payload = { signerAddress: accountContext.signer.address, address };
    console.log(payload);
    const sig = await accountContext.signer.signMessage(JSON.stringify(payload));

    let n = 0
    while (true) {
      try {
        const response = await axios.post(`${window.location.origin}/api/chaindata`, { sig, payload })
        console.log(`attempt ${n++}:`, response);
        // TODO: Do we need status check here?
        if (response.status === 200 && typeof response.data === "object") {
          const history = response.data
          console.log(`Got address history:`, history);
          history.transactions.forEach(tx => {
            const error = getEthTransactionError(tx);
            if (error) {
              throw new Error(error);
            }
          });
          console.log(`Address history verified, saving to accontContext`);
          accountContext.chainData.merge(history);
          accountContext.setChainData(accountContext.chainData);
          setSyncing({ ...syncing, [address]: false });
          break;
        }

        await new Promise(res => setTimeout(res, 3000));
      } catch(e) {
          //TODO: set api key alert
          console.log(e, e.response.data);
          if (e.response && e.response.data.includes("Invalid API Key")) {
            setStatusAlert({
              open: true,
              severity: "error",
              message: "Please register with valid etherscan API key",
            })
          }
          setSyncing({ ...syncing, [adddress]: false});
          break;
      }
    }

    // TODO: Set success alert message
    //console.log(`Successfuly synced address history for ${address}`);
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
                    <IconButton
                      disabled={syncing[entry.address]}
                      color="secondary"
                      size="small"
                      onClick={() => syncHistory(entry.address)}
                    >
                      <SyncIcon />
                    </IconButton>
                    { syncing[entry.address] ? <CircularProgress /> : null}
                  </TableCell>
                </TableRow>
              )
          })}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

export const AccountInfo = (props: any) => {
  const classes = useStyles();
  const accountContext = useContext(AccountContext);
  const { saveProfile, setProfile } = props;

  const [statusAlert, setStatusAlert] = useState({
    open: false,
    message: "",
    severity: "info" as "info" | "error" | "warning" | "success"
  });

  const handleClose = () => {
    setStatusAlert({
      ...statusAlert,
      open: false,
    })
  };

  const defaultProfile = {
    username: accountContext.profile.username || "Default",
    infuraKey: accountContext.profile.infuraKey || "abc123",
    addressBook: accountContext.profile.addressBook || [],
  };

  const handleSave = () => {
    let newProfile = {...accountContext.profile};
    console.log(`Saving ${newProfile}`);
    saveProfile();
  }

  const handleUsernameChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    console.log(`Set profile.username = "${event.target.value}"`);
    const newProfile = {...accountContext.profile, username: event.target.value};
    setProfile(newProfile);
  };

  const handleKeyChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    console.log(`Set profile.infuraKey = "${event.target.value}"`);
    const newProfile = {...accountContext.profile, infuraKey: event.target.value};
    setProfile(newProfile);
  };

  useEffect(() => {
    console.log(`Setting default profile values: ${JSON.stringify(defaultProfile)}`);
    setProfile(defaultProfile);
  }, []); // eslint-disable-line

  const resetData = (): void => {
    setProfile(emptyProfile);
    saveProfile();
  };

  console.log(accountContext.profile);

  return (
    <div className={classes.root}>
      <Button
        variant="contained"
        color="primary"
        size="small"
        onClick={resetData}
        startIcon={<DeleteIcon />}
      >
        Reset Cached events
      </Button>
      <Divider/>

      <Typography variant="h4">
        Account Info
      </Typography>
      <Divider/>

      <TextField
        id="profile-name"
        label="Profile Name"
        defaultValue={defaultProfile.username}
        onChange={handleUsernameChange}
        helperText="Choose a name for your profile eg. Shiv Personal, etc."
        margin="normal"
        variant="outlined"
      />

      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;

      <TextField
        id="api-key"
        label="Infura Key"
        defaultValue={defaultProfile.infuraKey}
        onChange={handleKeyChange}
        helperText="Register an etherscan API Key to sync chain data"
        margin="normal"
        variant="outlined"
      />

      <Button
        variant="contained"
        color="primary"
        size="small"
        onClick={handleSave}
        startIcon={<SaveIcon />}
      >
        Save Profile
      </Button>

      <AddNewAddress setProfile={setProfile} />
      <AddressList setStatusAlert={setStatusAlert}/>

      <Divider/>
      <Snackbar
        open={statusAlert.open}
        autoHideDuration={6000}
        onClose={handleClose}
        message={statusAlert.message}
        className={classes.snackbar}
      >
        <Alert onClose={handleClose} severity={statusAlert.severity}>
          {statusAlert.message}
        </Alert>
      </Snackbar>
    </div>
  )
}
