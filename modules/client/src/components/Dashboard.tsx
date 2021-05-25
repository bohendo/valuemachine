import {
  ArgumentScale,
} from "@devexpress/dx-react-chart";
import {
  ArgumentAxis,
  Chart,
  Legend,
  LineSeries,
  PieSeries,
  Title,
  ValueAxis,
} from "@devexpress/dx-react-chart-material-ui";
import { getPrices } from "@finances/core";
import { AddressBook } from "@finances/types";
import { getLogger } from "@finances/utils";
import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import { scaleTime } from "d3-scale";
import React, { useState, useEffect } from "react";

import { store } from "../store";

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

////////////////////////////////////////
// Asset Distribution
const indent = 5;
const getCoordinates = (startAngle: number, endAngle: number, maxRadius: number) => {
  const angle = startAngle + (endAngle - startAngle) / 2;
  return {
    x: (maxRadius + indent) * Math.sin(angle),
    y: (maxRadius + indent) * Math.cos(angle)
  };
};
const pointComponent = (props: any) => {
  const { startAngle, endAngle, maxRadius, arg, val, value } = props;
  const { x, y } = getCoordinates(startAngle, endAngle, maxRadius);
  // TODO: Find a better way to display slice values
  //console.log(props)
  //console.log(x, y)
  return (
    <React.Fragment>
      <PieSeries.Point {...props} />
      <Chart.Label
        x={arg + x}
        y={val - y}
        dominantBaseline="middle"
        textAnchor="middle"
      >
        {value.toFixed(2)}
      </Chart.Label>
    </React.Fragment>
  );
};
export const AssetDistribution = (props: any) => {
  const [data, setData] = useState([] as { asset: string; total: number; totalUSD: number; }[]);
  const {
    totalByAsset,
    date,
  } = props;
  useEffect(() => {
    (async () => {
      const temp = [];
      const prices = getPrices(store, getLogger("info"));
      for (const entry of Object.entries(totalByAsset)) {
        if (entry[1] > 0 ) {
          const price = await prices.getPrice(entry[0], date);
          temp.push({ asset: entry[0], total: entry[1] * price });
        }
      }
      setData(temp);
    })();
  }, [date, totalByAsset]);
  if (!data || data.length === 0) return (<> Will have asset distribution soon </>);
  return (
    <Paper>
      <Chart
        data={data}
      >
        <PieSeries
          valueField="total"
          argumentField="asset"
          outerRadius={1}
          pointComponent={pointComponent}
        />
        <Legend position="right" />
        <Title position="top" text="Asset Distribution" />
      </Chart>
    </Paper>
  );
};

////////////////////////////////////////
// Networth Graph
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
export const NetWorthGraph = (props: any) => {
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

////////////////////////////////////////
// Dashboard
export const Dashboard: React.FC = ({
  addressBook,
}: {
  addressBook: AddressBook;
}) => {
  console.log(`We have ${addressBook?.addresses?.length} addresses`);
  return (<p>Dashboard is under construction, try again later</p>);
};
