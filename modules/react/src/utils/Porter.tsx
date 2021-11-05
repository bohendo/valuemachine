import DownloadIcon from "@mui/icons-material/GetApp";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import React from "react";

type PorterProps = {
  data: any;
  getError: (val: any) => string | undefined;
  name: string;
  setData: (val: any) => void;
  title: string;
};
export const Porter: React.FC<PorterProps> = ({
  data,
  getError,
  name,
  setData,
  title,
}: PorterProps) => {

  const handleImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.readAsText(file);
    reader.onload = () => {
      try {
        if (!reader.result) return;
        const fileContents = JSON.parse(reader.result as string) as any;
        const importedData = fileContents[name] || fileContents;
        // create new objet/array to ensure it re-renders;
        const newData = typeof data.length === "number" ? [ ...data ] : { ...data };
        if (!getError(importedData)) {
          console.log(`Imported valid ${name}`, importedData);
          setData(newData);
        } else {
          console.error(`Imported invalid ${name}`, importedData);
          throw new Error(`Imported file does not contain valid ${name}: ${
            getError(importedData)
          }`);
        }
      } catch (e) {
        console.error(e);
      }
    };
  };

  const handleExport = () => {
    const output = JSON.stringify(data, null, 2);
    const dataUrl = `text/json;charset=utf-8,${encodeURIComponent(output)}`;
    const a = document.createElement("a");
    a.href = "data:" + dataUrl;
    a.download = `${name}.json`;
    a.click();
  };

  return (<>
    <Paper sx={{ p: 3, maxWidth: "64em" }}>
      <Grid container spacing={2} sx={{ justifyContent: "flex-start", overflow: "auto" }}>

        <Grid item>
          <Typography variant="h6">
            {`Import ${title}`}
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
            {`Export ${title}`}
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
