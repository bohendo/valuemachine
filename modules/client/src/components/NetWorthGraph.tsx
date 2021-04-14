import React from "react";
import {
  Paper,
  Theme,
  createStyles,
  makeStyles,
} from "@material-ui/core";
import {
  Chart,
  ArgumentAxis,
  ValueAxis,
  LineSeries,
  Title,
  Legend,
} from "@devexpress/dx-react-chart-material-ui";
import { scaleTime } from "d3-scale";
import {
  ArgumentScale,
} from "@devexpress/dx-react-chart";

const useStyles = makeStyles((theme: Theme) => createStyles({
  root: {
    display: "flex",
    margin: "auto",
    flexDirection: "row",
  },
  label: {
    paddingTop: theme.spacing(1),
    whiteSpace: "nowrap",
  },
  item: {
    flexDirection: "column",
  },
  chart: {
    paddingRight: "20px",
  },
  title: {
    whiteSpace: "pre",
  },
}));

//const format = scale => scale.tickFormat(4, d => 10
//+ formatPower(Math.round(Math.log(d) / Math.LN10)));

const LegendRootBase = (props: any) => {
  const classes = useStyles();
  return <Legend.Root {...props} className={classes.root} />;
};
const LegendLabelBase = (props: any) => {
  const classes = useStyles();
  return <Legend.Label className={classes.label} {...props} />;
};
const LegendItemBase = (props: any) => {
  const classes = useStyles();
  return <Legend.Item className={classes.item} {...props} />;
};

const ValueLabel = (props: any) => {
  const { text } = props;
  return (
    <ValueAxis.Label
      {...props}
      text={`$${text}`}
    />
  );
};

const TitleText = (props: any) => {
  const classes = useStyles();
  return <Title.Text {...props} className={classes.title} />;
};

export const NetWorth = (props: any) => {
  const { netWorthTimeline } = props;

  if (!netWorthTimeline || netWorthTimeline.length === 0) {
    return <> Will have net worth graph soon </>;
  }

  return (
    <Paper>
      <Chart
        data={netWorthTimeline}
      >
        <ArgumentScale factory={scaleTime} />
        <ArgumentAxis />
        <ValueAxis
          labelComponent={ValueLabel}
        />

        <LineSeries
          name="Net Worth"
          valueField="networth"
          argumentField="date"
        />
        {/*<LineSeries name="Debt" valueField="debt" argumentField="date" />*/}
        <Legend
          position="bottom"
          rootComponent={LegendRootBase}
          itemComponent={LegendItemBase}
          labelComponent={LegendLabelBase}
        />
        <Title
          text={"NetWorth over time"}
          textComponent={TitleText}
        />
      </Chart>
    </Paper>
  );
};

/*
          <LineSeries
            name="Asset"
            valueField="assets"
            argumentField="year"
          />
 */
