import React, { useCallback, useEffect, useState } from "react";

import axios from "axios";
import {
  Button,
  Card,
  CardHeader,
  Chip,
  Divider,
  FormControl,
  FormHelperText,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
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
  GetApp as DownloadIcon,
  RemoveCircle as RemoveIcon,
  Save as SaveIcon,
} from "@material-ui/icons";
import {
  Address,
  AddressEntry,
  StoreKeys,
} from "@finances/types";
import { Wallet } from "ethers";

import { store } from "../utils/cache";

const tagsSelect = [
  "active",
  "proxy",
];

const addressCategories = [
  "self",
  "friend",
  "family",
]

const useStyles = makeStyles((theme: Theme) => createStyles({
  root: {
    '& > *': {
      margin: theme.spacing(1),
    },
  },
  chip: {
      margin: 2,
  },
  input: {
    margin: theme.spacing(1),
    minWidth: 120,
    maxWidth: 300,
  },
}));

const AddListItem = (props: any) => {
  const [newAddressEntry, setNewAddressEntry] = useState({
    tags: ["active"],
    category: "self"
  } as AddressEntry);

  const { profile, setProfile } = props;

  const classes = useStyles();

  const handleChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setNewAddressEntry({...newAddressEntry, [event.target.name]: event.target.value});
    console.log(newAddressEntry)
  };

  const addNewAddress = () => {
    const newProfile = {...profile, addressBook: [...profile.addressBook, newAddressEntry]}
    setProfile(newProfile);
    store.save(StoreKeys.Profile, newProfile);
  };

  return (
    <Card>
      <CardHeader title={"Add new Address"} />
      <IconButton onClick={addNewAddress} >
        <AddIcon />
      </IconButton>
      <TextField
        id="address"
        label="Eth Address"
        defaultValue="0xabc..."
        helperText="Add your ethereum address to fetch info"
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
        defaultValue="Shivhend.eth"
        helperText="Give your account a nickname"
        name="name"
        onChange={handleChange}
        margin="normal"
        variant="outlined"
      />
      <FormControl variant="outlined" className={classes.input}>
        <InputLabel id="Tags">Tags</InputLabel>
        <Select
          labelId="tags-select-drop"
          id="tags-select"
          multiple
          value={newAddressEntry.tags || []}
          name="tags"
          onChange={handleChange}
          renderValue={(selected) => (
            <div className={classes.chips}>
              {(selected as string[]).map((value) => (
                <Chip key={value} label={value} className={classes.chip} />
              ))}
            </div>
          )}
        >
          {tagsSelect.map((name) => (
            <MenuItem key={name} value={name}>
              {name}
            </MenuItem>
          ))}
        </Select>
        <FormHelperText>Select relevant tags for this address</FormHelperText>
      </FormControl>
    </Card>
  )
}

const AddressList = (props: any) => {
  const { category, chainData, profile, setChainData, signer} = props;

  const syncHistory = async (signer: Wallet, address: Address) => {
    const payload = { signerAddress: signer.address, address };
    const sig = await signer.signMessage(JSON.stringify(payload));

    let n = 0
    while (true) {
      const history = await axios.post(`${window.location.origin}/api/chaindata`, { sig, payload });
      console.log(`attempt ${n++}:`, history);
      if (history.status === 200 && history.data) {
        chainData.merge(history.data);
        setChainData(chainData);
        break;
      }
      await new Promise(res => setTimeout(res, 3000));
    }

    console.log(`Successfuly synced address history for ${address}`);
  };

  return (
    <Card>
      <CardHeader title={category + " Accounts"} />
      <Divider />
      <Table>
        <TableHead>
          <TableRow>
            <TableCell> Action </TableCell>
            <TableCell> Eth Address </TableCell>
            <TableCell> Account name </TableCell>
            <TableCell> Tags </TableCell>
            <TableCell> Sync </TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          { profile.addressBook.map((entry: AddressEntry, i: number) => {
              if (entry.category === category.toLowerCase()) {
                return (
                  <TableRow key={i} >
                    <TableCell>
                      <IconButton onClick={console.log} >
                        <RemoveIcon />
                      </IconButton>
                    </TableCell>
                    <TableCell> {entry.address} </TableCell>
                    <TableCell> {entry.name} </TableCell>
                    <TableCell> {entry.tags} </TableCell>
                    <TableCell>

                      <Button
                        variant="contained"
                        color="primary"
                        size="small"
                        onClick={() => syncHistory(signer, entry.address)}
                        startIcon={<SyncIcon />}
                      >
                        Sync
                      </Button>

                    
                    </TableCell>
                  </TableRow>
                )
              } else {
                return null;
              }
          })}
        </TableBody>
      </Table>
    </Card>
  )
}

export const AccountInfo: React.FC = (props: any) => {
  const classes = useStyles();
  const { chainData, setChainData, profile, setProfile, signer } = props;

  const defaults = {
    username: profile.username || "Default",
    etherscanKey: profile.etherscanKey || "abc123",
  };

  const registerProfile = useCallback(async () => {
    if (!signer) {
      console.warn(`No signer available, can't register w/out one.`);
      return;
    }
    if (!profile || !profile.etherscanKey) {
      console.warn(`No api key provided, nothing to register. Personal=${JSON.stringify(profile)}`);
      return;
    }
    const payload = { profile, signerAddress: signer.address };
    const sig = await signer.signMessage(JSON.stringify(payload));
    const res = await axios.post(`${window.location.origin}/api/profile`, { sig, payload });
    console.log(res);
  }, [profile, signer]);

  const handleProfileChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    console.log(`Set profile.username = "${event.target.value}"`);
    const newProfile = {...profile, username: event.target.value};
    setProfile(newProfile);
    store.save(StoreKeys.Profile, newProfile);
  };

  const handleKeyChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    console.log(`Set profile.etherscanKey = "${event.target.value}"`);
    const newProfile = {...profile, etherscanKey: event.target.value};
    setProfile(newProfile);
    store.save(StoreKeys.Profile, newProfile);
  };

  useEffect(() => {
    console.log(`Setting default profile values: ${JSON.stringify(defaults)}`);
    setProfile(oldProfile => ({ ...defaults, ...oldProfile }));
  }, []); // eslint-disable-line

  const resetData = (): void => {
    [StoreKeys.Transactions, StoreKeys.State, StoreKeys.Events, StoreKeys.Profile].forEach(key => {
      console.log(`Resetting data for ${key}`);
      store.save(key);
    });
  };

  console.log(profile);

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
      <Button
        variant="contained"
        color="primary"
        size="small"
        className={classes.button}
        startIcon={<DownloadIcon />}
      >
        Download CSV
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
        helperText="Choose a name for your profile eg. Company ABC, Shiv G, etc."
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

      <AddressList category="Self" setProfile={setProfile} profile={profile} signer={signer} chainData={chainData} setChainData={setChainData} />
      <AddressList category="Friend" setProfile={setProfile} profile={profile} signer={signer} chainData={chainData} setChainData={setChainData} />
      <AddressList category="Family" setProfile={setProfile} profile={profile} signer={signer} chainData={chainData} setChainData={setChainData} />
      <AddListItem category={"self"} profile={profile} setProfile={setProfile} signer={signer} chainData={chainData} setChainData={setChainData} />

      <Divider/>
    </div>
  )
}
