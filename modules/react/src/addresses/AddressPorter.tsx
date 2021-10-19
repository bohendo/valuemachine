import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import DownloadIcon from "@mui/icons-material/GetApp";
import {
  AddressBook,
  AddressBookJson,
} from "@valuemachine/types";
import {
  getAddressBookError,
  getAddressEntryError,
  sortAddressEntries
} from "@valuemachine/utils";
import React from "react";

type AddressPorterProps = {
  addressBook: AddressBook,
  setAddressBookJson: (val: AddressBookJson) => void,
};
export const AddressPorter: React.FC<AddressPorterProps> = ({
  addressBook,
  setAddressBookJson,
}: AddressPorterProps) => {

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
    const output = JSON.stringify(sortAddressEntries(Object.values(addressBook.json)), null, 2);
    const data = `text/json;charset=utf-8,${encodeURIComponent(output)}`;
    const a = document.createElement("a");
    a.href = "data:" + data;
    a.download = "addressBook.json";
    a.click();
  };

  return (<>
    <Paper sx={{ p: 3, maxWidth: "24em" }}>
      <Typography variant="h6">
        {"Import Address Book"}
      </Typography>
      <Box sx={{ my: 2 }}>
        <input
          accept="application/json"
          id="profile-importer"
          onChange={handleAddressBookImport}
          type="file"
        />
      </Box>
      <Typography variant="h6">
        {"Export Address Book"}
      </Typography>
      <Button
        sx={{ my: 2 }}
        color="primary"
        onClick={handleExport}
        size="small"
        startIcon={<DownloadIcon />}
        variant="contained"
      >
        Download
      </Button>
    </Paper>
  </>);
};
