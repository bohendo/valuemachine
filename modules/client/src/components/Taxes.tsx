import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import { Forms } from "@valuemachine/taxes";
import { TaxPorter, TaxTable, F1040 } from "@valuemachine/react";
import {
  PhysicalGuards,
} from "@valuemachine/transactions";
import {
  AddressBook,
  EventTypes,
  Guard,
  Prices,
  TradeEvent,
  ValueMachine,
} from "@valuemachine/types";
import React, { useEffect, useState } from "react";

type TaxesExplorerProps = {
  addressBook: AddressBook;
  vm: ValueMachine,
  prices: Prices,
  forms: Forms,
  setForms: (val: Forms) => void,
};
export const TaxesExplorer: React.FC<TaxesExplorerProps> = ({
  addressBook,
  vm,
  prices,
  forms,
  setForms,
}: TaxesExplorerProps) => {
  const [tab, setTab] = useState(0);
  const [innerTab, setInnerTab] = useState(0);
  const [allGuards, setAllGuards] = useState([] as Guard[]);
  const [guard, setGuard] = React.useState("");

  useEffect(() => {
    setGuard(allGuards[tab]);
  }, [allGuards, tab]);

  useEffect(() => {
    if (!addressBook || !vm?.json?.events?.length) return;
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
  }, [addressBook, vm]);

  const handleTabChange = (event: React.ChangeEvent<{}>, newValue: number) => {
    setTab(newValue);
  };

  const handleInnerTabChange = (event: React.ChangeEvent<{}>, newValue: number) => {
    setInnerTab(newValue);
  };

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
        onChange={handleTabChange}
        sx={{ m: 1 }}
        textColor="secondary"
        value={tab}
      >
        {allGuards.map((guard, i) => (
          <Tab key={i} label={guard}/>
        ))}
      </Tabs>

      <Grid container sx={{ justifyContent: "center" }}>
        <Grid item sm={6}>
          <TaxPorter guard={guard} prices={prices} vm={vm} />
        </Grid>
      </Grid>

      <Tabs
        centered
        indicatorColor="secondary"
        onChange={handleInnerTabChange}
        sx={{ m: 1 }}
        textColor="secondary"
        value={innerTab}
      >
        <Tab label="Taxable Events Table"/>
        {guard === PhysicalGuards.USA ? <Tab label="f1040"/> : null}
      </Tabs>

      <div hidden={innerTab !== 0}>
        {innerTab === 0 ? <TaxTable guard={guard} prices={prices} vm={vm} /> : null}
      </div>

      <div hidden={innerTab !== 1 || guard !== PhysicalGuards.USA}>
        <F1040 formData={forms?.f1040 || {}} setFormData={f1040 => setForms({ ...forms, f1040 })} />
      </div>

    </>
  );
};
