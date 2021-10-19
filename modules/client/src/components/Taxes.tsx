import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import { SelectOne, TaxPorter, TaxTable } from "@valuemachine/react";
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
};
export const TaxesExplorer: React.FC<TaxesExplorerProps> = ({
  addressBook,
  vm,
  prices,
}: TaxesExplorerProps) => {
  const [allGuards, setAllGuards] = useState([] as Guard[]);
  const [guard, setGuard] = React.useState("");

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

  return (
    <>
      <Typography variant="h3">
        Taxes Explorer
      </Typography>
      <Divider/>

      <Typography variant="body1" sx={{ m: 1 }}>
        Physical Security provided by: {allGuards.join(", ")}
      </Typography>

      <Grid
        alignContent="center"
        alignItems="center"
        container
        spacing={1}
        sx={{ m: 1 }}
      >

        <Grid item md={4}>
          <SelectOne
            label="Guard"
            choices={allGuards}
            selection={guard}
            setSelection={newGuard => setGuard(newGuard)}
          />
        </Grid>

        <Grid item md={8}>
          <TaxPorter guard={guard} prices={prices} vm={vm} />
        </Grid>

      </Grid>

      <TaxTable guard={guard} prices={prices} vm={vm} />

    </>
  );
};
