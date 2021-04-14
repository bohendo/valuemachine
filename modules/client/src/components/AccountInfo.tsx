import React, { useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  Button,
  createStyles,
  Divider,
  Grid,
  makeStyles,
  Snackbar,
  TextField,
  Theme,
  Typography,
} from "@material-ui/core";
import {
  Save as SaveIcon,
} from "@material-ui/icons";
import { Alert } from "@material-ui/lab";
import { emptyProfile, ProfileJson } from "@finances/types";
import axios from "axios";

import { AddNewAddress } from "./AddNewAddress";
import { AddressList } from "./AddressList";

const useStyles = makeStyles((theme: Theme) => createStyles({
  root: {
    margin: theme.spacing(1),
    padding: theme.spacing(1),
  },
  input: {
    margin: theme.spacing(1),
    minWidth: 120,
    maxWidth: 300,
  },
  importer: {
    margin: theme.spacing(2),
  },
  snackbar: {
    width: "100%"
  },
  button: {
    marginBottom: theme.spacing(1.5),
  },
}));

export const AccountInfo = ({
  profile,
  setProfile,
}: {
  profile: any;
  setProfile: (val: any) => void;
}) => {
  const [modified, setModified] = useState(false);
  const [newProfile, setNewProfile] = useState(emptyProfile);
  const [statusAlert, setStatusAlert] = useState({
    open: false,
    message: "",
    severity: "info" as "info" | "error" | "warning" | "success"
  });

  const classes = useStyles();

  useEffect(() => {
    setNewProfile(profile);
  }, [profile]);

  useEffect(() => {
    if (newProfile.username !== profile.username || newProfile.authToken !== profile.authToken) {
      setModified(true);
    } else {
      setModified(false);
    }
  }, [newProfile, profile]);

  const handleClose = () => {
    setStatusAlert({
      ...statusAlert,
      open: false,
    });
  };

  const handleSave = async () => {
    console.log(`Saving ${JSON.stringify(newProfile)}...`);
    const res = await axios({
      method: "POST",
      url: "/api/profile",
      data: newProfile,
      headers: { "content-type": "application/json" },
    });
    if (res.status === 200) {
      setProfile(newProfile);
    } else {
      console.warn(res);
    }
  };

  const handleUsernameChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    console.log(`Set profile.username = "${event.target.value}"`);
    setNewProfile(oldProfile => ({ ...oldProfile, username: event.target.value }));
  };

  const handleAuthTokenChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    console.log(`Set profile.authToken = "${event.target.value}"`);
    setNewProfile(oldProfile => ({ ...oldProfile, authToken: event.target.value }));
  };

  const handleImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.readAsText(file);
    reader.onload = () => {
      try {
        const importedAddresses = (JSON.parse(reader.result) as ProfileJson).addressBook;
        if (!importedAddresses) {
          throw new Error("Imported file does not contain an address book");
        }
        console.log(`File with an address book has been loaded:`, importedAddresses);
        const addressBook = newProfile.addressBook;
        importedAddresses.forEach(entry => {
          if (!newProfile.addressBook.some(
            e => e.address.toLowerCase() === entry.address.toLowerCase()
          )) {
            addressBook.push(entry);
          }
        });
        setNewProfile(oldVal => ({ ...oldVal, addressBook }));
        // handleSave();
      } catch (e) {
        console.error(e);
      }
    };
  };

  return (
    <div className={classes.root}>

      <Typography variant="h4">
        Account Info
      </Typography>

      <Divider/>

      <Grid alignContent="center" alignItems="center" container spacing={1}>

        <Grid item>
          <TextField
            autoComplete="off"
            helperText="Choose a name for your profile"
            id="username"
            label="Username"
            margin="normal"
            onChange={handleUsernameChange}
            value={newProfile.username}
            variant="outlined"
          />
        </Grid>

        <Grid item>
          <TextField
            autoComplete="off"
            helperText="Register an auth token to sync chain data"
            id="auth-token"
            label="Auth Token"
            margin="normal"
            onChange={handleAuthTokenChange}
            value={newProfile.authToken}
            variant="outlined"
          />
        </Grid>

        {modified ?
          <Grid item>
            <Button
              className={classes.button}
              color="primary"
              onClick={handleSave}
              size="small"
              startIcon={<SaveIcon />}
              variant="contained"
            >
              Save Profile
            </Button>
          </Grid>
          : undefined
        }

      </Grid>
      <Divider/>

      <Card className={classes.root}>
        <CardHeader title={"Import Address Book From File"}/>
        <input
          className={classes.importer}
          id="profile-importer"
          accept="application/json"
          type="file"
          onChange={handleImport}
        />
      </Card>

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
