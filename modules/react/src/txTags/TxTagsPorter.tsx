import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import DownloadIcon from "@mui/icons-material/GetApp";
import { TxTags } from "@valuemachine/types";
import { getTransactionsError } from "@valuemachine/utils";
import React from "react";

type TxTagsPorterProps = {
  txTags: TxTags,
  setTxTags: (val: TxTags) => void,
};
export const TxTagsPorter: React.FC<TxTagsPorterProps> = ({
  txTags,
  setTxTags,
}: TxTagsPorterProps) => {

  const handleImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.readAsText(file);
    reader.onload = () => {
      try {
        if (!reader.result) return;
        const importedData = JSON.parse(reader.result as string) as any;
        const importedTags = importedData.txTags || importedData;
        const newTags = { ...txTags }; // new obj to ensure it re-renders;
        if (!getTransactionsError(importedTags)) {
          console.log(`Tags have been imported:`, importedTags);
          setTxTags(newTags);
        } else {
          console.error(`Imported txTags are invalid:`, importedTags);
          throw new Error(`Imported file does not contain valid txTags: ${
            getTransactionsError(importedTags)
          }`);
        }
      } catch (e) {
        console.error(e);
      }
    };
  };

  const handleExport = () => {
    const output = JSON.stringify(txTags, null, 2);
    const data = `text/json;charset=utf-8,${encodeURIComponent(output)}`;
    const a = document.createElement("a");
    a.href = "data:" + data;
    a.download = "txTags.json";
    a.click();
  };

  return (<>
    <Paper sx={{ p: 3, maxWidth: "64em" }}>
      <Grid container spacing={2} justifyContent="flex-start">

        <Grid item>
          <Typography variant="h6">
            {"Import Tags"}
          </Typography>
          <Box sx={{ my: 2 }}>
            <input
              accept="application/json"
              id="profile-importer"
              onChange={handleImport}
              type="file"
            />
          </Box>
        </Grid>

        <Grid item>
          <Typography variant="h6">
            {"Export Tags"}
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
