import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import Button from "@material-ui/core/Button";
import Card from "@material-ui/core/Card";
import CardHeader from "@material-ui/core/CardHeader";
import DownloadIcon from "@material-ui/icons/GetApp";
import {
  AddressBook,
  AddressBookJson,
} from "@valuemachine/types";
import {
  getAddressBookError,
  getAddressEntryError,
} from "@valuemachine/utils";
import React from "react";

const useStyles = makeStyles((theme: Theme) => createStyles({
  root: {
    margin: theme.spacing(1),
    maxWidth: "98%",
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
}));

type AddressPorterProps = {
  addressBook: AddressBook,
  setAddressBookJson: (val: AddressBookJson) => void,
};
export const AddressPorter: React.FC<AddressPorterProps> = ({
  addressBook,
  setAddressBookJson,
}: AddressPorterProps) => {
  const classes = useStyles();

  const handleAddressBookImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.readAsText(file);
    reader.onload = () => {
      try {
        if (!reader.result) return;
        const importedData = JSON.parse(reader.result as string) as any;
        const importedAddresses = importedData.addressBook || importedData;
        const newAddressBook = { ...addressBook.json }; // new obj to ensure it re-renders;
        if (!getAddressBookError(importedAddresses)) {
          console.log(`File with an address book object has been loaded:`, importedAddresses);
          Object.keys(importedAddresses).forEach(address => {
            newAddressBook[address] = importedAddresses[address];
          });
        } else if (
          (importedAddresses.length && importedAddresses.every(e => !getAddressEntryError(e)))
        ) {
          console.log(`File with an array of address entries has been loaded:`, importedAddresses);
          importedAddresses.forEach(entry => {
            newAddressBook[entry.address] = entry;
          });
        } else {
          console.error(`Imported addresses are invalid:`, importedAddresses);
          throw new Error(`Imported file does not contain a valid address book: ${
            getAddressBookError(importedAddresses)
          }`);
        }
        setAddressBookJson(newAddressBook);
      } catch (e) {
        console.error(e);
      }
    };
  };

  const handleExport = () => {
    const output = JSON.stringify({ addressBook: addressBook.json }, null, 2);
    const data = `text/json;charset=utf-8,${encodeURIComponent(output)}`;
    const a = document.createElement("a");
    a.href = "data:" + data;
    a.download = "addressBook.json";
    a.click();
  };

  return (
    <React.Fragment>

      <Card className={classes.root}>
        <CardHeader title={"Import Address Book"}/>
        <input
          className={classes.importer}
          id="profile-importer"
          accept="application/json"
          type="file"
          onChange={handleAddressBookImport}
        />
        <CardHeader title={"Export Address Book"}/>
        <Button
          className={classes.exporter}
          color="primary"
          onClick={handleExport}
          size="small"
          startIcon={<DownloadIcon />}
          variant="contained"
        >
          Download
        </Button>
      </Card>

    </React.Fragment>
  );
};

