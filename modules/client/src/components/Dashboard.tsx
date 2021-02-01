import React, { useState, useContext, useEffect } from 'react';

import {
  Grid,
  Typography,
} from '@material-ui/core';

import { DateTime } from './DateTimePicker'

import { AccountContext } from "../accountContext";
import { getLiquidityPosition } from "../utils/utils";

export const Dashboard: React.FC = (props: any) => {
  const [endDate, setEndDate] = useState(new Date());
  const [liquidityPosition, setLiquidityPosition] = useState(new Date());
  const accountContext = useContext(AccountContext);

  useEffect(() => {
    (async () => {
      let position = await getLiquidityPosition("0x9248cd1c76bad6d009bcbf7e49315f1f6400030b");
      if (position) {
        setLiquidityPosition(position);
      }
    })();
  }, [])

  useEffect(() => {

  }, [liquidityPosition])

  if (!liquidityPosition) return (<div>Loading ...</div>)
  return (
    <>

    </>
  )
}
