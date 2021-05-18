import { AddressEntry, emptyProfile, ProfileJson } from "@finances/types";
import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import Button from "@material-ui/core/Button";
import Card from "@material-ui/core/Card";
import CardHeader from "@material-ui/core/CardHeader";
import CircularProgress from "@material-ui/core/CircularProgress";
import Divider from "@material-ui/core/Divider";
import FormControl from "@material-ui/core/FormControl";
import Grid from "@material-ui/core/Grid";
import IconButton from "@material-ui/core/IconButton";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import Paper from "@material-ui/core/Paper";
import Select from "@material-ui/core/Select";
import Snackbar from "@material-ui/core/Snackbar";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableContainer from "@material-ui/core/TableContainer";
import TableHead from "@material-ui/core/TableHead";
import TablePagination from "@material-ui/core/TablePagination";
import TableRow from "@material-ui/core/TableRow";
import TextField from "@material-ui/core/TextField";
import Typography from "@material-ui/core/Typography";
import AddIcon from "@material-ui/icons/AddCircle";
import DownloadIcon from "@material-ui/icons/GetApp";
import RemoveIcon from "@material-ui/icons/RemoveCircle";
import SaveIcon from "@material-ui/icons/Save";
import SyncIcon from "@material-ui/icons/Sync";
import { Alert } from "@material-ui/lab";
import axios from "axios";
import React, { useEffect, useState } from "react";

import { HexString } from "./HexString";

const useStyles = makeStyles((theme: Theme) => createStyles({
  root: {
    margin: theme.spacing(1),
    maxWidth: "98%",
  },
  paper: {
    minWidth: "500px",
    padding: theme.spacing(2),
  },
  divider: {
    marginBottom: theme.spacing(2),
    marginTop: theme.spacing(2),
  },
  select: {
    margin: theme.spacing(3),
    minWidth: 160,
  },
  input: {
    margin: theme.spacing(1),
    minWidth: 120,
    maxWidth: 300,
  },
  exporter: {
    marginBottom: theme.spacing(4),
    marginLeft: theme.spacing(4),
    marginRight: theme.spacing(4),
    marginTop: theme.spacing(0),
  },
  importer: {
    marginBottom: theme.spacing(1),
    marginLeft: theme.spacing(4),
    marginRight: theme.spacing(4),
    marginTop: theme.spacing(0),
  },
  syncing: {
    marginTop: theme.spacing(4),
    marginLeft: theme.spacing(4),
    marginRight: theme.spacing(4),
  },
  snackbar: {
    width: "100%"
  },
  button: {
    marginBottom: theme.spacing(1.5),
    marginLeft: theme.spacing(2),
    marginRight: theme.spacing(2),
  },
  title: {
    margin: theme.spacing(2),
  },
  subtitle: {
    margin: theme.spacing(2),
  },
  syncAll: {
    margin: theme.spacing(2),
  },
}));

const emptyAddressEntry = {
  address: "",
  category: "self",
  name: "",
} as AddressEntry;

export const AddressBook = ({
  profile,
  setProfile,
}: {
  profile: any;
  setProfile: (val: any) => void;
}) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(25);
  const [filteredAddresses, setFilteredAddresses] = useState([]);
  const [filterCategory, setFilterCategory] = useState("");
  const [addressModified, setAddressModified] = useState(false);
  const [newAddress, setNewAddress] = useState(emptyAddressEntry);
  const [newAddressError, setNewAddressError] = useState("");
  const [newProfile, setNewProfile] = useState(emptyProfile);
  const [newTokenError, setNewTokenError] = useState("");
  const [profileModified, setProfileModified] = useState(false);
  const [statusAlert, setStatusAlert] = useState({
    open: false,
    message: "",
    severity: "info" as "info" | "error" | "warning" | "success"
  });
  const [syncing, setSyncing] = useState({} as { [address: string]: boolean });
  const classes = useStyles();

  useEffect(() => {
    setFilteredAddresses(profile.addressBook.filter(entry =>
      !filterCategory || entry.category === filterCategory
    ));
  }, [profile, filterCategory]);

  useEffect(() => {
    setNewProfile(profile);
  }, [profile]);

  useEffect(() => {
    if (newProfile.authToken !== profile.authToken) {
      setProfileModified(true);
    } else {
      setProfileModified(false);
    }
  }, [newProfile, profile]);

  useEffect(() => {
    if (
      newAddress.address !== emptyAddressEntry.address ||
      newAddress.category !== emptyAddressEntry.category ||
      newAddress.name !== emptyAddressEntry.name
    ) {
      setAddressModified(true);
    } else {
      setAddressModified(false);
    }
  }, [newAddress]);

  const handleClose = () => {
    setStatusAlert({
      ...statusAlert,
      open: false,
    });
  };

  const handleSave = async () => {
    console.log(`Validating profile creds for anon:${newProfile.authToken}...`);
    const authorization = `Basic ${btoa(`anon:${newProfile.authToken}`)}`;
    axios.get("/api/auth", { headers: { authorization } }).then((authRes) => {
      if (authRes.status === 200) {
        setProfile({ ...newProfile });
      } else {
        console.error(authRes);
      }
    }).catch(() => {
      setNewTokenError("Invalid Auth Token");
    });

  };

  const handleAuthTokenChange = (event: React.ChangeEvent<{ value: string }>) => {
    console.log(`Set profile.authToken = "${event.target.value}"`);
    setNewProfile(oldProfile => ({ ...oldProfile, authToken: event.target.value }));
    setNewTokenError("");
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
        setProfile(oldVal => ({ ...oldVal, addressBook }));
        handleSave();
      } catch (e) {
        console.error(e);
      }
    };
  };

  const addNewAddress = () => {
    if (!newAddress.address) {
      setNewAddressError("Address is required");
    } else if (!newAddress.address.match(/0x[a-fA-F0-9]{40}/)) {
      setNewAddressError("Invalid address");
    } else {
      const i = profile.addressBook.findIndex(
        (o) => o.address.toLowerCase() === newAddress.address.toLowerCase()
      );
      if (i < 0) {
        const newProfile = {
          ...profile,
          addressBook: [...profile.addressBook, {
            ...newAddress,
            address: newAddress.address.toLowerCase(),
          }],
        };
        setProfile(newProfile);
        setNewAddress(emptyAddressEntry);
      } else {
        setNewAddressError("Address already added");
      }
    }
  };

  const handleAddressChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setNewAddress({ ...newAddress, [event.target.name]: event.target.value });
    setNewAddressError("");
  };

  const deleteAddress = (entry: AddressEntry) => {
    console.log(`Deleting ${JSON.stringify(entry)}`);
    const newProfile = {
      ...profile,
      addressBook: [...profile.addressBook],
    };
    const i = newProfile.addressBook
      .findIndex((o) => o.address.toLowerCase() === entry.address.toLowerCase());
    if (i >= 0) {
      newProfile.addressBook.splice(i,1);
      setProfile(newProfile);
    }
  };

  const syncAddress = async (address: string) => {
    console.log(`Syncing ${address}..`);
    setSyncing({ ...syncing, [address]: true });
    let n = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        const response = await axios.get(`/api/chaindata/${address}`);
        console.log(`attempt ${n++}:`, response);
        if (response.status === 200 && typeof response.data === "object") {
          const history = response.data;
          console.log(`Got address history:`, history);
          // chainData.merge(history);
          setSyncing({ ...syncing, [address]: false });
          break;
        }
      } catch (e) {
        console.warn(e.message);
      }
      await new Promise(res => setTimeout(res, 10_000));
    }
    // TODO: Set success alert message
    console.log(`Successfuly synced address history for ${address}`);
  };

  const syncAll = async () => {
    for (const entry of profile.addressBook.filter(e => e.category === "self")) {
      await syncAddress(entry.address);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  const handleFilterChange = (event: React.ChangeEvent<{ value: string }>) => {
    setFilterCategory(event.target.value);
  };

  return (
    <div className={classes.root}>

      <Typography variant="h4" className={classes.subtitle}>
        Authentication
      </Typography>

      <Grid alignContent="center" alignItems="center" container spacing={1} className={classes.root}>

        <Grid item>
          <TextField
            autoComplete="off"
            helperText={newTokenError || "Register an auth token to sync chain data"}
            error={!!newTokenError}
            id="auth-token"
            label="Auth Token"
            margin="normal"
            onChange={handleAuthTokenChange}
            value={newProfile.authToken}
            variant="outlined"
          />
        </Grid>

        {profileModified ?
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
      <Typography variant="h4" className={classes.subtitle}>
        Manage Address Book
      </Typography>

      <Grid alignContent="center" alignItems="center" justify="center" container spacing={1} className={classes.root}>

        <Grid item md={8}>
          <Card className={classes.root}>
            <CardHeader title={"Add new Address"} />
            <Grid alignContent="center" alignItems="center" container spacing={1} className={classes.root}>
              <Grid item md={6}>
                <TextField
                  autoComplete="off"
                  value={newAddress.name}
                  helperText="Give your account a nickname"
                  id="name"
                  fullWidth
                  label="Account Name"
                  margin="normal"
                  name="name"
                  onChange={handleAddressChange}
                  variant="outlined"
                />
              </Grid>
              <Grid item md={6}>
                <TextField
                  autoComplete="off"
                  value={newAddress.category}
                  helperText={`Only "self" category can be synced`}
                  id="category"
                  fullWidth
                  label="Category"
                  margin="normal"
                  name="category"
                  onChange={handleAddressChange}
                  variant="outlined"
                />
              </Grid>
              <Grid item md={6}>
                <TextField
                  autoComplete="off"
                  value={newAddress.address}
                  error={!!newAddressError}
                  helperText={newAddressError || "Add your ethereum address to fetch info"}
                  id="address"
                  fullWidth
                  label="Eth Address"
                  margin="normal"
                  name="address"
                  onChange={handleAddressChange}
                  variant="outlined"
                />
              </Grid>
              <Grid item md={6}>
                {addressModified ?
                  <Grid item>
                    <Button
                      className={classes.button}
                      color="primary"
                      onClick={addNewAddress}
                      size="small"
                      startIcon={<AddIcon />}
                      variant="contained"
                    >
                      Save Address
                    </Button>
                  </Grid>
                  : undefined
                }
              </Grid>
            </Grid>
          </Card>
        </Grid>

        <Grid item md={4}>
          <Card className={classes.root}>
            <CardHeader title={"Import Address Book"}/>
            <input
              className={classes.importer}
              id="profile-importer"
              accept="application/json"
              type="file"
              onChange={handleImport}
            />
            <CardHeader title={"Export Address Book"}/>
            <Button
              className={classes.exporter}
              color="primary"
              onClick={() => console.log("Export functionality coming soon")}
              size="small"
              startIcon={<DownloadIcon />}
              variant="contained"
            >
              Download
            </Button>
          </Card>

          <Button
            className={classes.syncAll}
            color="primary"
            onClick={syncAll}
            size="medium"
            disabled={Object.values(syncing).some(val => !!val)}
            startIcon={Object.values(syncing).some(val => !!val)
              ? <CircularProgress size={20} />
              : <SyncIcon />
            }
            variant="contained"
          >
            Sync All
          </Button>

        </Grid>

      </Grid>

      <Divider/>
      <Typography variant="h4" className={classes.subtitle}>
        Address Book Filters
      </Typography>

      <FormControl className={classes.select}>
        <InputLabel id="select-filter-category">Filter Category</InputLabel>
        <Select
          labelId="select-filter-category"
          id="select-filter-category"
          value={filterCategory || ""}
          onChange={handleFilterChange}
        >
          <MenuItem value={""}>-</MenuItem>
          {Array.from(new Set(profile.addressBook.map(entry => entry.category))).map(cat => (
            <MenuItem key={cat} value={cat}>{cat}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <Paper className={classes.paper}>

        <Typography align="center" variant="h4" className={classes.title} component="div">
          {filteredAddresses.length === profile.addressBook.length
            ? `${filteredAddresses.length} Addresses`
            : `${filteredAddresses.length} of ${profile.addressBook.length} Addresses`
          }
        </Typography>

        <TableContainer>
          <TablePagination
            rowsPerPageOptions={[25, 50, 100, 250]}
            component="div"
            count={filteredAddresses.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onChangePage={handleChangePage}
            onChangeRowsPerPage={handleChangeRowsPerPage}
          />
          <Table>
            <TableHead>
              <TableRow>
                <TableCell> Account name </TableCell>
                <TableCell> Category </TableCell>
                <TableCell> Eth Address </TableCell>
                <TableCell> Actions </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAddresses
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .sort((e1, e2) =>
                  // put self addresses first
                  (e1.category !== "self" && e2.category === "self") ? 1
                    : (e1.category === "self" && e2.category !== "self") ? -1
                      // sort by category
                      : (e1.category.toLowerCase() > e2.category.toLowerCase()) ? 1
                        : (e1.category.toLowerCase() < e2.category.toLowerCase()) ? -1
                          // then sort by name
                          : (e1.name.toLowerCase() > e2.name.toLowerCase()) ? 1
                            : (e1.name.toLowerCase() < e2.name.toLowerCase()) ? -1
                              // then sort by address
                              : (e1.address.toLowerCase() > e2.address.toLowerCase()) ? 1
                                : (e1.address.toLowerCase() < e2.address.toLowerCase()) ? -1
                                  : 0
                ).map((entry: AddressEntry, i: number) => (
                  <TableRow key={i}>
                    <TableCell> {entry.name} </TableCell>
                    <TableCell> {entry.category} </TableCell>
                    <TableCell> <HexString value={entry.address}/> </TableCell>
                    <TableCell>
                      <IconButton color="secondary" onClick={() => deleteAddress(entry)}>
                        <RemoveIcon />
                      </IconButton>
                      {entry.category === "self" ?
                        !syncing[entry.address] ?
                          <IconButton color="secondary" onClick={() => syncAddress(entry.address)}>
                            <SyncIcon />
                          </IconButton>
                          :
                          <IconButton>
                            <CircularProgress size={20}/>
                          </IconButton>
                        : undefined
                      }
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
          <TablePagination
            rowsPerPageOptions={[25, 50, 100, 250]}
            component="div"
            count={filteredAddresses.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onChangePage={handleChangePage}
            onChangeRowsPerPage={handleChangeRowsPerPage}
          />
        </TableContainer>
      </Paper>

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
