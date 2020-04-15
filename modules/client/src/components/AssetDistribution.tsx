import React, { useState, useEffect } from 'react';
import _ from 'lodash';

/*
import {
  getCoordinates,
} from '../utils/utils';
*/

import {
  Paper,
} from '@material-ui/core';

import {
  Chart,
  Legend,
  PieSeries,
  Title,
} from '@devexpress/dx-react-chart-material-ui';
import { Animation } from '@devexpress/dx-react-chart';

/*
TODO: Find a better way to display slice values
const pointComponent = (props: any) => {
  const { startAngle, endAngle, maxRadius, arg, val, value } = props;
  const { x, y } = getCoordinates(startAngle, endAngle, maxRadius);

  console.log(props)
  console.log(x, y)
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
*/

export const AssetDistribution = (props: any) => {
  const [data, setData] = useState();
  const {
    netStandingByAssetTypeOn,
  } = props;

  useEffect(() => {
    setData(_.filter(netStandingByAssetTypeOn, (o: any) => o.totalUSD > 0))
  }, [netStandingByAssetTypeOn]);

  if (!data) return <> Will have asset distribution soon </>

  return (
    <Paper>
      <Chart
        data={data}
      >
        <PieSeries
          valueField="totalUSD"
          argumentField="asset"
          outerRadius={1}
        />
        <Legend position="right" />
        <Title position="top" text="Asset Distribution" />
      </Chart>
    </Paper>
  );
}
