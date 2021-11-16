import SyncIcon from "@mui/icons-material/Sync";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import { TaxPorter, TaxTable } from "@valuemachine/react";
import { getTaxRows } from "@valuemachine/taxes";
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
  const [syncMsg, setSyncMsg] = useState("");
  const [tab, setTab] = useState(0);

  const syncRows = async () => {
    if (!addressBook?.json || !prices?.json || !vm?.json?.events?.length) return;
    setSyncMsg("Syncing..");
    setTaxRows(getTaxRows({ addressBook, prices, txTags, userUnit: unit, vm }));
    setSyncMsg("");
  };

  useEffect(() => {
    setGuard(guards[tab]);
  }, [guards, tab]);

  useEffect(() => {
    if (!taxRows?.length) return;
    const newGuards = dedup([
      allGuards,
      Guards.None,
      ...taxRows.map(row => row.guard).sort(),
    ]) as Guard[];
    setGuards(newGuards);
    setGuard(newGuards[0]);
  }, [taxRows]);

  return (
    <>
      <Typography variant="h3">
        Taxes Explorer
      </Typography>

      <Button
        sx={{ m: 2, maxWidth: 0.95  }}
        disabled={!!syncMsg}
        onClick={syncRows}
        startIcon={syncMsg ? <CircularProgress size={20} /> : <SyncIcon/>}
        variant="outlined"
      >
        {syncMsg || `Sync Tax Rows w ${vm?.json?.events?.length || "0"} VM Events`}
      </Button>

      <Divider sx={{ my: 1 }} />

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

      {(guard !== allGuards && guard !== Guards.None) ? (
        <Grid container sx={{ justifyContent: "center", mb: 2 }}>
          <Grid item sm={6}>
            <TaxPorter
              guard={guard}
              taxInput={taxInput}
              taxRows={taxRows}
            />
          </Grid>
        </Grid>
      ) : null}

      <TaxTable
        guard={guard === allGuards ? "" : guard}
        setTxTags={setTxTags}
        txTags={txTags}
        taxRows={taxRows}
        unit={unit}
      />

    </>
  );
};
