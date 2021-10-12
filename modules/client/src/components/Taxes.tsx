import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import Divider from "@material-ui/core/Divider";
import Grid from "@material-ui/core/Grid";
import Typography from "@material-ui/core/Typography";
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

const useStyles = makeStyles((theme: Theme) => createStyles({
  root: {
    margin: theme.spacing(1),
  },
  select: {
    margin: theme.spacing(3),
    minWidth: "160px",
  },
  title: {
    paddingTop: theme.spacing(2),
  },
  exportButton: {
    marginBottom: theme.spacing(4),
    marginLeft: theme.spacing(4),
    marginRight: theme.spacing(4),
    marginTop: theme.spacing(0),
  },
  exportCard: {
    margin: theme.spacing(2),
    minWidth: "255px",
  },
}));

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
  const classes = useStyles();
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

      <Typography variant="body1" className={classes.root}>
        Physical Security provided by: {allGuards.join(", ")}
      </Typography>

      <Grid
        alignContent="center"
        alignItems="center"
        container
        spacing={1}
        className={classes.root}
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
