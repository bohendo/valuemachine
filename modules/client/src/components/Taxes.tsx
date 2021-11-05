import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import { TaxPorter, TaxTable } from "@valuemachine/react";
import {
  PhysicalGuards,
} from "@valuemachine/transactions";
import {
  AddressBook,
  EventTypes,
  Guard,
  Prices,
  TaxInput,
  TradeEvent,
  TxTags,
  ValueMachine,
} from "@valuemachine/types";
import React, { useEffect, useState } from "react";

type TaxesExplorerProps = {
  addressBook: AddressBook;
  prices: Prices;
  taxInput: TaxInput;
  txTags: TxTags;
  vm: ValueMachine;
};
export const TaxesExplorer: React.FC<TaxesExplorerProps> = ({
  addressBook,
  prices,
  taxInput,
  txTags,
  vm,
}: TaxesExplorerProps) => {
  const [tab, setTab] = useState(0);
  const [allGuards, setAllGuards] = useState([] as Guard[]);
  const [guard, setGuard] = React.useState("");

  useEffect(() => {
    setGuard(allGuards[tab]);
  }, [allGuards, tab]);

  useEffect(() => {
    if (!vm?.json?.events?.length) return;
    const newGuards = Array.from(vm.json.events
      .filter(
        e => e.type === EventTypes.Trade || e.type === EventTypes.Income
      ).reduce((setOfGuards, evt) => {
        const guard = (evt as TradeEvent).account?.split("/")?.[0];
        if (Object.keys(PhysicalGuards).includes(guard)) {
          setOfGuards.add(guard);
        }
        return setOfGuards;
      }, new Set())
    ).sort() as Guard[];
    setAllGuards(newGuards);
    setGuard(newGuards[0]);
  }, [vm]);

  return (
    <>
      <Typography variant="h3">
        Taxes Explorer
      </Typography>
      <Divider/>

      <Typography variant="body1" sx={{ m: 1 }}>
        Physical Security provided by: {allGuards.join(", ")}
      </Typography>

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

      <Grid container sx={{ justifyContent: "center", mb: 2 }}>
        <Grid item sm={6}>
          <TaxPorter
            addressBook={addressBook}
            guard={guard}
            prices={prices}
            vm={vm}
            taxInput={taxInput}
            txTags={txTags}
          />
        </Grid>
      </Grid>

      <TaxTable addressBook={addressBook} guard={guard} prices={prices} vm={vm} />

    </>
  );
};
