import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardHeader from "@mui/material/CardHeader";
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
    <Card sx={{ p: 2 }}>
      <CardHeader title={"Import Address Book"}/>
      <Box sx={{ mb: 1, mx: 4, mt: 0 }}>
        <input
          accept="application/json"
          id="profile-importer"
          onChange={handleAddressBookImport}
          type="file"
        />
      </Box>
      <CardHeader title={"Export Address Book"}/>
      <Button
        sx={{ mb: 4, mx: 4, mt: 0 }}
        color="primary"
        onClick={handleExport}
        size="small"
        startIcon={<DownloadIcon />}
        variant="contained"
      >
        Download
      </Button>
    </Card>
  </>);
};
