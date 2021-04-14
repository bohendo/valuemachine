import {
  Chart,
  Legend,
  PieSeries,
  Title,
} from "@devexpress/dx-react-chart-material-ui";
import { getPrices } from "@finances/core";
import {
  Paper,
} from "@material-ui/core";
import React, { useState, useEffect } from "react";

import { store } from "../utils/cache";
import { getCoordinates } from "../utils/utils";

/*
TODO: Find a better way to display slice values
*/
const pointComponent = (props: any) => {
  const { startAngle, endAngle, maxRadius, arg, val, value } = props;
  const { x, y } = getCoordinates(startAngle, endAngle, maxRadius);

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
  const [data, setData] = useState([] as { assetType: string; total: number; totalUSD: number; }[]);
  const {
    totalByAssetType,
    date,
  } = props;

  useEffect(() => {
    (async () => {
      const temp = [];
      const prices = getPrices(store, console);
      for (const entry of Object.entries(totalByAssetType)) {
        if (entry[1] > 0 ) {
          const price = await prices.getPrice(entry[0], date);
          temp.push({ assetType: entry[0], total: entry[1] * price });
        }
      }
      setData(temp);
    })();
  }, [date, totalByAssetType]);

  if (!data || data.length === 0) return (<> Will have asset distribution soon </>);

  return (
    <Paper>
      <Chart
        data={data}
      >
        <PieSeries
          valueField="total"
          argumentField="assetType"
          outerRadius={1}
          pointComponent={pointComponent}
        />
        <Legend position="right" />
        <Title position="top" text="Asset Distribution" />
      </Chart>
    </Paper>
  );
};
