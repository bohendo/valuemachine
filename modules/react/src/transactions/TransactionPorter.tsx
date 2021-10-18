import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardHeader from "@mui/material/CardHeader";
import DownloadIcon from "@mui/icons-material/GetApp";
import { TransactionsJson } from "@valuemachine/types";
import { getTransactionsError } from "@valuemachine/utils";
import React from "react";

type TransactionPorterProps = {
  transactions: TransactionsJson,
  setTransactions: (val: TransactionsJson) => void,
};
export const TransactionPorter: React.FC<TransactionPorterProps> = ({
  transactions,
  setTransactions,
}: TransactionPorterProps) => {

  const handleTransactionsImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.readAsText(file);
    reader.onload = () => {
      try {
        if (!reader.result) return;
        const importedData = JSON.parse(reader.result as string) as any;
        const importedTransactions = importedData.transactions || importedData;
        const newTransactions = [ ...transactions ]; // new obj to ensure it re-renders;
        if (!getTransactionsError(importedTransactions)) {
          console.log(`Transactions have been imported:`, importedTransactions);
          setTransactions(newTransactions);
        } else {
          console.error(`Imported transactions are invalid:`, importedTransactions);
          throw new Error(`Imported file does not contain valid transactions: ${
            getTransactionsError(importedTransactions)
          }`);
        }
      } catch (e) {
        console.error(e);
      }
    };
  };

  const handleExport = () => {
    const output = JSON.stringify(transactions, null, 2);
    const data = `text/json;charset=utf-8,${encodeURIComponent(output)}`;
    const a = document.createElement("a");
    a.href = "data:" + data;
    a.download = "transactions.json";
    a.click();
  };

  return (<>
    <Card sx={{ p: 2 }}>
      <CardHeader title={"Import Transactions"}/>
      <Box sx={{ mb: 1, mx: 4, mt: 0 }}>
        <input
          accept="application/json"
          id="profile-importer"
          onChange={handleTransactionsImport}
          type="file"
        />
      </Box>
      <CardHeader title={"Export Transactions"}/>
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
