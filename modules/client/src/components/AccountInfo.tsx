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
  StoreKeys,
  emptyProfile,
} from "@finances/types";
import { getEthTransactionError } from "@finances/core";
import { Wallet } from "ethers";

import { AccountContext } from "../accountContext";

const addressCategories = [
  "self",
  "friend",
  "family",
]

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

const AddListItem = (props: any) => {
  const [newAddressEntry, setNewAddressEntry] = useState({
    category: "self",
    name: "hot-wallet",
  } as AddressEntry);
  const [newEntryError, setNewEntryError] = useState({ err: false, msg: "Add your ethereum address to fetch info"});

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
        accountContext.setProfile(newProfile);
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
      <FormControl variant="outlined" className={classes.input}>
        <InputLabel id="Category">Category</InputLabel>
        <Select
          labelId="category-select-drop"
          id="category-select"
          value={newAddressEntry.category || "self"}
          name="category"
          onChange={handleChange}
        >
          {addressCategories.map((category) => (
            <MenuItem key={category} value={category}>
              {category}
            </MenuItem>
          ))}
        </Select>
        <FormHelperText>Select address category</FormHelperText>
      </FormControl>
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

const AddressList = (props: any) => {
  const classes = useStyles();

  const accountContext = useContext(AccountContext);
  const { signer, setStatusAlert} = props;
  const [sync, setSync] = useState(false);

  const deleteAddress = (entry: AddressEntry) => {
    console.log(`Deleting ${JSON.stringify(entry)}`);
    const newProfile = {...accountContext.profile, addressBook: [...accountContext.profile.addressBook]}
    let i = newProfile.addressBook.findIndex((o) => o.address.toLowerCase() === entry.address.toLowerCase())
    if (i >= 0) {
      newProfile.addressBook.splice(i,1)
      accountContext.setProfile(newProfile);
    }
  };

  const syncHistory = async (signer: Wallet, address: Address) => {
    setSync(true);
    const payload = { signerAddress: signer.address, address };
    console.log(payload);
    const sig = await signer.signMessage(JSON.stringify(payload));

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
          setSync(false);
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
          setSync(false);
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
                      disabled={sync}
                      color="secondary"
                      size="small"
                      onClick={() => syncHistory(signer, entry.address)}
                    >
                      <SyncIcon />
                    </IconButton>
                    { sync ? <CircularProgress /> : null}
                  </TableCell>
                </TableRow>
              )
          })}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

export const AccountInfo: React.FC = (props: any) => {
  const classes = useStyles();
  const accountContext = useContext(AccountContext);
  const { signer } = props;

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

  const defaults = {
    username: accountContext.profile.username || "Default",
    etherscanKey: accountContext.profile.etherscanKey || "abc123",
  };

  const registerProfile = useCallback(async () => {
    if (!signer) {
      console.warn(`No signer available, can't register w/out one.`);
      return;
    }
    if (!accountContext.profile || !accountContext.profile.etherscanKey) {
      console.warn(`No api key provided, nothing to register. Personal=${JSON.stringify(accountContext.profile)}`);
      return;
    }
    const payload = { profile: accountContext.profile, signerAddress: signer.address };
    const sig = await signer.signMessage(JSON.stringify(payload));
    const res = await axios.post(`${window.location.origin}/api/profile`, { sig, payload });
    console.log(res);
  }, [accountContext.profile, signer]);

  const handleProfileChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    console.log(`Set profile.username = "${event.target.value}"`);
    const newProfile = {...accountContext.profile, username: event.target.value};
    accountContext.setProfile(newProfile);
  };

  const handleKeyChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    console.log(`Set profile.etherscanKey = "${event.target.value}"`);
    const newProfile = {...accountContext.profile, etherscanKey: event.target.value};
    accountContext.setProfile(newProfile);
  };

  useEffect(() => {
    console.log(`Setting default profile values: ${JSON.stringify(defaults)}`);
    accountContext.setProfile(oldProfile => ({ ...defaults, ...oldProfile }));
  }, []); // eslint-disable-line

  const resetData = (): void => {
    [StoreKeys.Transactions, StoreKeys.State, StoreKeys.Events].forEach(key => {
      console.log(`Resetting data for ${key}`);
      store.save(key);
    });
    accountContext.setProfile(emptyProfile)
  };

  console.log(accountContext.profile);

  return (
    <div className={classes.root}>
      <Button
        variant="contained"
        color="primary"
        size="small"
        className={classes.button}
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
        defaultValue={defaults.username}
        onChange={handleProfileChange}
        helperText="Choose a name for your profile eg. Shiv Personal, etc."
        margin="normal"
        variant="outlined"
      />

      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;

      <TextField
        id="api-key"
        label="Api Key"
        defaultValue={defaults.etherscanKey}
        onChange={handleKeyChange}
        helperText="Register an etherscan API Key to sync chain data"
        margin="normal"
        variant="outlined"
      />

      <Button
        variant="contained"
        color="primary"
        size="small"
        className={classes.button}
        onClick={registerProfile}
        startIcon={<SaveIcon />}
      >
        Register Profile
      </Button>

      <AddListItem signer={signer} setStatusAlert={setStatusAlert} />
      <AddressList signer={signer} setStatusAlert={setStatusAlert}/>

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
