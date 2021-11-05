import DownloadIcon from "@mui/icons-material/GetApp";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import {
  AddressBookJson,
  CsvFiles,
  InputData,
  TaxInput,
  TransactionsJson,
  TxTags,
} from "@valuemachine/types";
import { getAddressBookError, getCsvFilesError, getTransactionsError } from "@valuemachine/utils";
import React from "react";

type InputPorterProps = {
  csvFiles: CsvFiles;
  setCsvFiles: (val: CsvFiles) => void;
  addressBook: AddressBookJson;
  setAddressBook: (val: AddressBookJson) => void;
  customTxns: TransactionsJson;
  setCustomTxns: (val: TransactionsJson) => void;
  taxInput?: TaxInput;
  setTaxInput?: (val: TaxInput) => void;
  txTags?: TxTags;
  setTxTags?: (val: TxTags) => void;
};
export const InputPorter: React.FC<InputPorterProps> = ({
  csvFiles,
  setCsvFiles,
  addressBook,
  setAddressBook,
  customTxns,
  setCustomTxns,
  taxInput,
  setTaxInput,
  txTags,
  setTxTags,
}: InputPorterProps) => {

  const handleImport = (event: any) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.readAsText(file);
    reader.onload = () => {
      try {
        if (!reader.result || typeof reader.result !== "string") return;
        const result = JSON.parse(reader.result) as InputData;
        if (!getAddressBookError(result.addressBook)) {
          setAddressBook(result.addressBook);
        } else {
          console.warn(getAddressBookError(result.addressBook), result.addressBook);
        }
        if (!getCsvFilesError(result.csvFiles)) {
          setCsvFiles(result.csvFiles);
        } else {
          console.warn(getCsvFilesError(result.csvFiles), result.csvFiles);
        }
        if (!getTransactionsError(result.customTxns)) {
          setCustomTxns(result.customTxns);
        } else {
          console.warn(getTransactionsError(result.customTxns), result.customTxns);
        }
        if (result.txTags) {
          setTxTags?.(result.txTags);
        }
        if (result.taxInput) {
          setTaxInput?.(result.taxInput);
        }
      } catch (e) {
        console.error(e);
      }
    };
  };

  const handleExport = () => {
    const output = JSON.stringify({
      addressBook,
      csvFiles,
      customTxns,
      taxInput,
      txTags,
    }, null, 2);
    const data = `text/json;charset=utf-8,${encodeURIComponent(output)}`;
    const a = document.createElement("a");
    a.href = "data:" + data;
    a.download = "valuemachine.json";
    a.click();
  };

  return (<>
    <Paper sx={{ p: 3, maxWidth: "64em" }}>
      <Grid container spacing={2} justifyContent="center">

        <Grid item>
          <Typography variant="h6">
            {"Import ValueMachine Data"}
          </Typography>
          <Box sx={{ my: 2 }}>
            <input
              accept="application/json"
              id="file-importer"
              onChange={handleImport}
              type="file"
            />
          </Box>
        </Grid>

        <Grid item>
          <Typography variant="h6">
            {"Export ValueMachine Data"}
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
        </Grid>

      </Grid>
    </Paper>
  </>);
};


