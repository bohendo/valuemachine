import {
  EventTypes,
} from "@finances/types";
import axios from "axios";

const INDENT = 5;
const uniSubgraphUrl = "https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2"

export const inTypes = [
  EventTypes.Borrow,
  EventTypes.GiftIn,
  EventTypes.Income,
  EventTypes.Mint,
  EventTypes.SwapIn,
  EventTypes.Withdraw,
];

export const outTypes = [
  EventTypes.Burn,
  EventTypes.Deposit,
  EventTypes.Expense,
  EventTypes.GiftOut,
  EventTypes.Repay,
  EventTypes.SwapOut,
];

export const getCoordinates = (startAngle: number, endAngle: number, maxRadius: number) => {
  const angle = startAngle + (endAngle - startAngle) / 2;
  return {
    x: (maxRadius + INDENT) * Math.sin(angle),
    y: (maxRadius + INDENT) * Math.cos(angle)
  };
};

export const getLiquidityPosition = async (user: string) => {

  const query = `query{
    liquidityPositionSnapshots (
      where: {
        user: "${user}"
      }
    ){
      reserve0
      reserve1
      liquidityTokenTotalSupply
      liquidityTokenBalance
      pair{
        reserve0
        reserve1
        totalSupply
      }
    }
  }`;

  const result = (await axios.post(uniSubgraphUrl, { query, variable: {},
    crossdomain: true,
    headers: {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "json",
    }
  }));

  if (result.status === 200)
    return result.data.data;
  else return null;
  
}
