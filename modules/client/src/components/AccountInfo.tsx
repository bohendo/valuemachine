import React, { useContext, useEffect, useState } from "react";
import {
  Button,
  Divider,
  Snackbar,
  TextField,
  Theme,
  Typography,
  createStyles,
  makeStyles,
} from "@material-ui/core";
import {
  Delete as DeleteIcon,
  Save as SaveIcon,
} from "@material-ui/icons";
import { Alert } from "@material-ui/lab";
import { emptyProfile } from "@finances/types";

import { AccountContext } from "../accountContext";

import { AddNewAddress } from "./AddNewAddress";
import { AddressList } from "./AddressList";

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
    });
  };

  const defaultProfile = {
    username: accountContext.profile.username || "Default",
    infuraKey: accountContext.profile.infuraKey || "abc123",
    addressBook: accountContext.profile.addressBook || [],
  };

  const handleSave = () => {
    const newProfile = { ...accountContext.profile };
    console.log(`Saving ${JSON.stringify(newProfile)}`);
    saveProfile();
  };

  const handleUsernameChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    console.log(`Set profile.username = "${event.target.value}"`);
    const newProfile = { ...accountContext.profile, username: event.target.value };
    setProfile(newProfile);
  };

  const handleKeyChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    console.log(`Set profile.infuraKey = "${event.target.value}"`);
    const newProfile = { ...accountContext.profile, infuraKey: event.target.value };
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
      <AddressList setProfile={setProfile}/>

      <Divider/>
      <Snackbar
        open={statusAlert.open}
        autoHideDuration={6000}j
        onClose={handleClose}
        message={statusAlert.message}
        className={classes.snackbar}
      >
        <Alert onClose={handleClose} severity={statusAlert.severity}>
          {statusAlert.message}
        </Alert>
      </Snackbar>
    </div>
  );
};
