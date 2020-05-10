import React, { useState } from "react";

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
  GetApp as DownloadIcon,
  RemoveCircle as RemoveIcon,
  Save as SaveIcon,
} from "@material-ui/icons";
import {
  AddressEntry,
  StoreKeys,
} from "@finances/types";

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
  chip: {
      margin: 2,
  },
  grow: {
    borderBottom: `5px solid ${theme.palette.divider}`,
  },
  input: {
    margin: theme.spacing(1),
    minWidth: 120,
    maxWidth: 300,
  },
}));

const AddListItem = (props: any) => {
  const [newAddressEntry, setNewAddressEntry] = useState({category: "self"} as AddressEntry);
  const { personal, setPersonal } = props;

  const classes = useStyles();

  const handleChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setNewAddressEntry({...newAddressEntry, [event.target.name]: event.target.value});
    console.log(newAddressEntry)
  };

  const addNewAddress = () => {
    setPersonal({...personal, addressBook: [...personal.addressBook, newAddressEntry]});
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
  const { category, personal } = props;
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
          </TableRow>
        </TableHead>

        <TableBody>
          { personal.addressBook.map((entry: AddressEntry, i: number) => {
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
  const { personal, setPersonal } = props;

  const handleChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setPersonal({...personal, profileName: event.target.value});
  };

  const resetData = (): void => {
    const keys = [StoreKeys.Transactions, StoreKeys.State, StoreKeys.Events];
    keys.forEach(key => {
      if (!key) throw new Error(`${key} isn't a valid store key`);
      store.save(key);
    });
  };

  return (
    <div className={classes.grow}>
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
        defaultValue={personal.profileName || "Default"}
        onChange={handleChange}
        helperText="Choose a name for your profile eg. Company ABC, Shiv G, etc."
        margin="normal"
        variant="outlined"
      />

      <TextField
        id="api-key"
        label="Api Key"
        defaultValue={personal.apiKey || "abc123"}
        onChange={handleChange}
        helperText="Provide an etherscan API Key to sync chain data"
        margin="normal"
        variant="outlined"
      />

      <AddressList category="Self" setPersonal={setPersonal} personal={personal} />
      <AddressList category="Friend" setPersonal={setPersonal} personal={personal} />
      <AddressList category="Family" setPersonal={setPersonal} personal={personal} />
      <AddListItem category={"self"} personal={personal} setPersonal={setPersonal} />

      <Divider/>
      <Button
        variant="contained"
        color="primary"
        size="small"
        className={classes.button}
        onClick={() => store.save("personal", personal)}
        startIcon={<SaveIcon />}
      >
        Save LocalStorage
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
    </div>
  )
}
