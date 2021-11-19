import ClearIcon from "@mui/icons-material/Delete";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import { SyncTaxRows, TaxPorter, TaxSummary, TaxTable } from "@valuemachine/react";
import { Guards } from "@valuemachine/transactions";
import {
  AddressBook,
  Asset,
  Guard,
  Prices,
  ValueMachine,
  TaxInput,
  TaxRows,
  TxTags,
} from "@valuemachine/types";
import { dedup } from "@valuemachine/utils";
import React, { useEffect, useState } from "react";

const allGuards = "All";

type TaxesExplorerProps = {
  addressBook?: AddressBook;
  globalSyncMsg: string;
  prices?: Prices;
  setTaxRows: (val: TaxRows) => void;
  setTxTags: (val: TxTags) => void;
  taxInput: TaxInput;
  taxRows: TaxRows;
  txTags: TxTags;
  unit?: Asset;
  vm?: ValueMachine;
};
export const TaxesExplorer: React.FC<TaxesExplorerProps> = ({
  addressBook,
  globalSyncMsg,
  prices,
  setTaxRows,
  setTxTags,
  taxInput,
  taxRows,
  txTags,
  unit,
  vm,
}: TaxesExplorerProps) => {
  const [guard, setGuard] = React.useState("");
  const [guards, setGuards] = useState([] as Guard[]);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    setGuard(guards[tab]);
  }, [guards, tab]);

  useEffect(() => {
    if (!taxRows?.length) return;
    const newGuards = dedup([
      allGuards,
      Guards.None,
      ...taxRows.map(row => row.taxYear.substring(0, 3)).sort(),
    ]) as Guard[];
    setGuards(newGuards);
    setGuard(newGuards[0]);
  }, [taxRows]);

  const handleClear = () => { setTaxRows([]); };

  return (<>
    <Typography variant="h3">
      Taxes Explorer
    </Typography>

    <SyncTaxRows
      addressBook={addressBook}
      disabled={!!globalSyncMsg}
      prices={prices}
      setTaxRows={setTaxRows}
      txTags={txTags}
      unit={unit}
      vm={vm}
    />

    <Button
      sx={{ m: 3 }}
      disabled={!!globalSyncMsg || !taxRows?.length}
      onClick={handleClear}
      startIcon={<ClearIcon/>}
      variant="outlined"
    >
      Clear Tax Rows
    </Button>

    <Divider sx={{ mb: 2 }} />

    {taxRows.length ? (
      <Tabs
        centered
        indicatorColor="secondary"
        onChange={(evt, newVal) => setTab(newVal)}
        sx={{ m: 1 }}
        textColor="secondary"
        value={tab}
      >
        {guards.map((g, i) => (
          <Tab key={i} label={g}/>
        ))}
      </Tabs>
    ) : null}

    <Grid container spacing={2} sx={{ justifyContent: "center", mb: 2 }}>
      <Grid item sm={8}>
        <TaxSummary
          guard={guard === allGuards ? "" : guard}
          prices={prices}
          taxInput={taxInput}
          taxRows={taxRows}
          unit={unit}
        />
      </Grid>
      {(guard && guard !== allGuards && guard !== Guards.None) ? (
        <Grid item sm={4}>
          <TaxPorter
            guard={guard}
            taxInput={taxInput}
            taxRows={taxRows}
          />
        </Grid>
      ) : null}
    </Grid>

    <TaxTable
      guard={guard === allGuards ? "" : guard}
      setTxTags={setTxTags}
      txTags={txTags}
      taxRows={taxRows}
      unit={unit}
    />

  </>);
};
