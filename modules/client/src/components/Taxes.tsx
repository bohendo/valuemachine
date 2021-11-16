import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import { TaxPorter, TaxTable } from "@valuemachine/react";
import {
  Guards,
} from "@valuemachine/transactions";
import {
  Asset,
  Guard,
  TaxInput,
  TaxRows,
  TxTags,
} from "@valuemachine/types";
import { dedup } from "@valuemachine/utils";
import React, { useEffect, useState } from "react";

type TaxesExplorerProps = {
  setTxTags: (val: TxTags) => void;
  taxInput: TaxInput;
  taxRows: TaxRows;
  txTags: TxTags;
  unit?: Asset;
};
export const TaxesExplorer: React.FC<TaxesExplorerProps> = ({
  setTxTags,
  taxInput,
  taxRows,
  txTags,
  unit,
}: TaxesExplorerProps) => {
  const [tab, setTab] = useState(0);
  const [allGuards, setAllGuards] = useState([] as Guard[]);
  const [guard, setGuard] = React.useState("");

  useEffect(() => {
    setGuard(allGuards[tab]);
  }, [allGuards, tab]);

  useEffect(() => {
    if (!taxRows?.length) return;
    const newGuards = [
      Guards.None,
      dedup(taxRows.map(row => row.guard)).sort(),
    ] as Guard[];
    setAllGuards(newGuards);
    setGuard(newGuards[0]);
  }, [taxRows]);

  return (
    <>
      <Typography variant="h3">
        Taxes Explorer
      </Typography>
      <Divider/>

      <Tabs
        centered
        indicatorColor="secondary"
        onChange={(evt, newVal) => setTab(newVal)}
        sx={{ m: 1 }}
        textColor="secondary"
        value={tab}
      >
        {allGuards.map((guard, i) => (
          <Tab key={i} label={guard}/>
        ))}
      </Tabs>

      {guard !== Guards.None ? (
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
        guard={guard}
        setTxTags={setTxTags}
        txTags={txTags}
        taxRows={taxRows}
        unit={unit}
      />

    </>
  );
};
