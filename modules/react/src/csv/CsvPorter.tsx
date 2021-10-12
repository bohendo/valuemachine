import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import Card from "@material-ui/core/Card";
import CardHeader from "@material-ui/core/CardHeader";
import {
  CsvFiles,
} from "@valuemachine/types";
import React from "react";

const useStyles = makeStyles((theme: Theme) => createStyles({
  card: {
    padding: theme.spacing(2),
  },
  fileInput: {
    marginBottom: theme.spacing(1),
    marginLeft: theme.spacing(4),
    marginRight: theme.spacing(4),
    marginTop: theme.spacing(4),
  },
}));

type CsvPorterProps = {
  csvFiles: CsvFiles,
  setCsvFiles: (val: CsvFiles) => void,
};
export const CsvPorter: React.FC<CsvPorterProps> = ({
  csvFiles,
  setCsvFiles,
}: CsvPorterProps) => {
  const classes = useStyles();

  const handleCsvFileImport = (event: any) => {
    const file = event.target.files[0];
    console.log(`Importing csv file`, file);
    if (!file) return;
    const reader = new FileReader();
    reader.readAsText(file);
    reader.onload = () => {
      try {
        const importedFile = reader.result as string;
        console.log(`Imported ${file.name}`);
        setCsvFiles([...csvFiles, {
          name: file.name,
          data: importedFile,
        }] as CsvFiles);
      } catch (e) {
        console.error(e);
      }
    };
  };

  return (<>

    <Card className={classes.card}>
      <CardHeader title={"Import CSV File"}/>
      <input
        accept="text/csv"
        className={classes.fileInput}
        id="file-importer"
        onChange={handleCsvFileImport}
        type="file"
      />
    </Card>

  </>);
};


