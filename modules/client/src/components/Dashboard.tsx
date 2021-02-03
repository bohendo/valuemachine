import React, { useState, useContext, useEffect } from 'react';

import {
  Grid,
  Typography,
} from '@material-ui/core';
import {  Profile } from "@finances/types";

import { DateTime } from './DateTimePicker'

import { AccountContext } from "../accountContext";
import { getCurrentLiquidityPositions } from "../utils/query";
import { getProfile } from "../utils/profile";

export const Dashboard: React.FC = (props: any) => {
  const [endDate, setEndDate] = useState(new Date());
  const [liquidityPosition, setLiquidityPosition] = useState(new Date());
  const accountContext = useContext(AccountContext);
  const [profileInstance, setProfileInstance] = useState(getProfile(accountContext.profile) as Profile);

  useEffect(() => {
    (async () => {
      
      let positions = await getCurrentLiquidityPositions(profileInstance.getAddresses());
      console.log(positions);
      if (positions) {
        setLiquidityPosition(positions);
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
