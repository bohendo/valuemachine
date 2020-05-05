import React, { useState, useEffect } from "react";

import {
  Button,
  Card,
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
  TableCell,
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
  const [tags, setTags] = useState([] as string[]);

  const classes = useStyles();
  const handleChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setTags(event.target.value as string[]);
  };

  return (
    <TableRow>
      <TableCell>
        <IconButton
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
          margin="normal"
          variant="outlined"
        />
      </TableCell>
      <TableCell>
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
      </TableCell>
      <TableCell>
        <TextField
          id="name"
          label="Account Name"
          defaultValue="Shivhend.eth"
          helperText="Give your account a nickname"
          margin="normal"
          variant="outlined"
        />
      </TableCell>
      <TableCell>
        <FormControl className={classes.input}>
          <InputLabel id="Tags">Chip</InputLabel>
          <Select
            labelId="tags-select-drop"
            id="tags-select"
            multiple
            value={tags}
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

/*
const AddressList = (title: React.ReactNode, addressBook: AddressBookJson) => {
  <Card>
    <CardHeader title={title} />
    <Divider />
    <List dense component="div" role="list">
    </List>
  </Card>
}
*/

export const AccountInfo: React.FC = () => {
  const classes = useStyles();
  const [personal, setPersonal] = useState({} as Personal);

  useEffect(() => {
    setPersonal(cache.loadPersonal())
  }, []);

  return (
    <div className={classes.grow}>
      <Typography variant="h4">
        Account Info
      </Typography>
      
      <Divider/>
      <TextField
        id="profile-name"
        label="Profile Name"
        defaultValue={personal.name || "Default"}
        helperText="Choose a name for your profile eg. Company ABC, Shiv G, etc."
        margin="normal"
        variant="outlined"
      />

      <Typography variant="h6">
        Personal Accounts
      </Typography>
      <AddListItem category="self" />

      <Typography variant="h6">
        Friend/Family Accounts
      </Typography>

      <Divider/>
      <Button
        variant="contained"
        color="primary"
        size="small"
        className={classes.button}
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

