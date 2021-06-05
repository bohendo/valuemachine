import {
  EventTypes,
  Events,
} from "@finances/types";
import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import Divider from "@material-ui/core/Divider";
import Typography from "@material-ui/core/Typography";
import React, { useEffect, useState } from "react";

const useStyles = makeStyles((theme: Theme) => createStyles({
  root: {
    margin: theme.spacing(1),
  },
}));

export const TaxesExplorer = ({
  events,
}: {
  events: Events,
}) => {
  const classes = useStyles();
  const [jurisdictions, setJurisdictions] = useState([]);

  useEffect(() => {
    setJurisdictions(Array.from(events
      .filter(e => e.type === EventTypes.JurisdictionChange)
      .reduce((all, cur) => {
        all.add(cur.oldJurisdiction);
        all.add(cur.newJurisdiction);
        return all;
      }, new Set())
    ));
  }, [events]);

  return (
    <>
      <Typography variant="h3" className={classes.root}>
        Taxes Explorer
      </Typography>
      <Divider/>

      <Typography variant="p">
        Security provided by: {jurisdictions.join(", ")}
      </Typography>
    </>
  );
};
