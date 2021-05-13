import React /*, { useState, useContext, useEffect }*/ from "react";
// import { Profile } from "@finances/types";
// import { toBN } from "@finances/utils";

// import { AccountContext } from "../accountContext";
// import { getCurrentLiquidityPositions, getPairLiquidityPositionSnapshots } from "../utils/query";
// import { getProfile } from "../utils/profile";

export const Dashboard: React.FC = () => {
  return (<p>Dashboard is under construction, try again later</p>);
  /*
  const [liquidityPositions, _setLiquidityPositions] = useState([]);
  const [liquiditySnapshots, setLiquiditySnapshots] = useState({});
  const accountContext = useContext(AccountContext);
  const [profileInstance, setProfileInstance] = useState(
    getProfile(accountContext.profile) as Profile,
  );

  useEffect(() => {
    setProfileInstance(getProfile(accountContext.profile));
  }, [accountContext.profile]);

  useEffect(() => {
    (async () => {
      
      const addresses = profileInstance.getAddresses();
      const positions = await getCurrentLiquidityPositions(addresses);

      if (positions) {
        const liquidityInfo = {};

        for (const position of positions.liquidityPositions) {
          const snapshot = await getPairLiquidityPositionSnapshots(addresses, position.pair.id);
          liquidityInfo[position.pair.id] = {
            snapshots: snapshot.liquidityPositionSnapshots,
            pairStats: snapshot.pair
          };
        } 
        setLiquiditySnapshots(liquidityInfo);
      }
    })();
  }, [profileInstance]);

  useEffect(() => {

  }, [liquidityPositions]);

  if (!liquiditySnapshots || Object.keys(liquiditySnapshots).length === 0) {
    return (<p>Dashboard is under construction, try again later</p>);
  }

  console.log(liquiditySnapshots);
  return (
    <>
      {Object.values(liquiditySnapshots).map( (liquidityInfo) => {
        const r0 = liquidityInfo.snapshots[0].reserve0;
        const r1 = liquidityInfo.snapshots[0].reserve1;
        const liqTokenBal = liquidityInfo.snapshots[0].liquidityTokenBalance;
        const liqTokenTotalAtSupply = liquidityInfo.snapshots[0].liquidityTokenTotalSupply;
        const liqTokenTotalNow = liquidityInfo.pairStats.totalSupply;
        console.log(r0, r1, liqTokenTotalNow);

        return (<> 
          Pair: {liquidityInfo.pairStats.token0.symbol} - {liquidityInfo.pairStats.token1.symbol}
          Orignal Supply Balance: {toBN(liqTokenBal).div(liqTokenTotalAtSupply)}
          Orignal Supply Value:
            ETH: 
        </>);

      })}
    </>
  );
  */
};
