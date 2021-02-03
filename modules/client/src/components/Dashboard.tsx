import React, { useState, useContext, useEffect } from 'react';
import { BigNumber as BN, utils} from "ethers";

import {
  Grid,
  Typography,
} from '@material-ui/core';
import {  Profile } from "@finances/types";

import { AccountContext } from "../accountContext";
import { getCurrentLiquidityPositions, getPairLiquidityPositionSnapshots } from "../utils/query";
import { getProfile } from "../utils/profile";

export const Dashboard: React.FC = (props: any) => {
  const [endDate, setEndDate] = useState(new Date());
  const [liquidityPositions, setLiquidityPositions] = useState([]);
  const [liquiditySnapshots, setLiquiditySnapshots] = useState({});
  const accountContext = useContext(AccountContext);
  const [profileInstance, setProfileInstance] = useState(getProfile(accountContext.profile) as Profile);

  useEffect(() => {
    setProfileInstance(getProfile(accountContext.profile));
  }, [accountContext.profile])

  useEffect(() => {
    (async () => {
      
      let addresses = profileInstance.getAddresses();
      let positions = await getCurrentLiquidityPositions(addresses);

      if (positions) {
        let liquidityInfo = {};

        for (const position of positions.liquidityPositions) {
          let snapshot = await getPairLiquidityPositionSnapshots(addresses, position.pair.id);
          liquidityInfo[position.pair.id] = {
            snapshots: snapshot.liquidityPositionSnapshots,
            pairStats: snapshot.pair
          }
        } 
        setLiquiditySnapshots(liquidityInfo);
      }
    })();
  }, [profileInstance])

  useEffect(() => {

  }, [liquidityPositions])

  if (!liquiditySnapshots || Object.keys(liquiditySnapshots).length === 0) return (<div>Loading ...</div>)

  console.log(liquiditySnapshots);
  return (
    <>
      {Object.values(liquiditySnapshots).map( (liquidityInfo) => {
        let r0 = liquidityInfo.snapshots[0].reserve0;
        let r1 = liquidityInfo.snapshots[0].reserve1;
        let liqTokenBal = liquidityInfo.snapshots[0].liquidityTokenBalance;
        let liqTokenTotalAtSupply = liquidityInfo.snapshots[0].liquidityTokenTotalSupply;
        let liqTokenTotalNow = liquidityInfo.pairStats.totalSupply;

        return (<> 
          Pair: {liquidityInfo.pairStats.token0.symbol} - {liquidityInfo.pairStats.token1.symbol}
          Orignal Supply Balance: {BN.from(liqTokenBal).div(liqTokenTotalAtSupply)}
          Orignal Supply Value:
            ETH: 
        </>)

      })}
    </>
  )
}