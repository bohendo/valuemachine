import React, { useState, useEffect } from "react";

import {
  Button,
  Card,
  CardHeader,
  Chip,
  Container,
  Divider,
  FormControl,
  Grid,
  IconButton,
  Input,
  InputLabel,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableRow,
  TextField,
  Theme,
  Typography,
  createStyles,
  makeStyles,
} from '@material-ui/core';
import {
  GetApp as DownloadIcon,
  Save as SaveIcon,
  AddCircle as AddIcon,
} from "@material-ui/icons";
import {
  AddressData,
} from "@finances/types";

import * as cache from "../utils/cache";
import { Personal } from "../types";

const tagsSelect = [
  "active",
  "proxy",
];

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
  const [newAddressData, setNewAddressData] = useState({} as AddressData);
  const { category, personal, setPersonal } = props;

  const classes = useStyles();
  useEffect(() => {
    setNewAddressData({...newAddressData, category: category.toLowerCase()});
  }, []);

  const handleChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setNewAddressData({...newAddressData, [event.target.name]: event.target.value});
    console.log(newAddressData)
  };

  const addNewAddress = () => {
    setPersonal({...personal, addressBook: [...personal.addressBook, newAddressData]});
  };

  return (
    <TableRow>
      <TableCell>
        <IconButton
          onClick={addNewAddress}
        >
          <AddIcon />
        </IconButton>
      </TableCell>
      <TableCell>
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
      </TableCell>
      {/*<TableCell>
        <TextField
          id="category"
          label="Category"
          defaultValue={props.category}
          helperText="Address category. self/friend/family/employer etc."
          InputProps={{
            readOnly: true,
          }}
          variant="outlined"
        />
      </TableCell>*/}
      <TableCell>
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
      </TableCell>
      <TableCell>
        <FormControl className={classes.input}>
          <InputLabel id="Tags">Tags</InputLabel>
          <Select
            labelId="tags-select-drop"
            id="tags-select"
            multiple
            value={newAddressData.tags || []}
            name="tags"
            onChange={handleChange}
            input={<Input />}
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
        </FormControl>
      </TableCell>
    </TableRow>
  )
}

const AddressList = (props: any) => {
  const { category, personal, setPersonal } = props;
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
          { personal.addressBook.map((entry: AddressData, i: number) => {
              if (entry.category === category.toLowerCase())
                return (
                  <TableRow key={i} >
                    <TableCell> Action </TableCell>
                    <TableCell> {entry.address} </TableCell>
                    <TableCell> {entry.name} </TableCell>
                    <TableCell> {entry.tags} </TableCell>
                  </TableRow>
                )
            })
          }
          <TableRow>
            <TableCell colSpan={4}>
              Add {category} accounts here
            </TableCell>
          </TableRow>
        </TableBody>
        
        <TableFooter>
          <AddListItem category={category} personal={personal} setPersonal={setPersonal} />
        </TableFooter>
      </Table>
    </Card>
  )
}

export const AccountInfo: React.FC = (props: any) => {
  const classes = useStyles();
  const {personal, setPersonal} = props;

  const handleChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setPersonal({...personal, profileName: event.target.value});
  };

  return (
    <div className={classes.grow}>
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

      <AddressList category="Self" setPersonal={setPersonal} personal={personal} />
      <AddressList category="Friend" setPersonal={setPersonal} personal={personal} />
      <AddressList category="Family" setPersonal={setPersonal} personal={personal} />

      <Divider/>
      <Button
        variant="contained"
        color="primary"
        size="small"
        className={classes.button}
        onClick={() => cache.savePersonal(personal)}
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
