import { Address } from "@finances/types";
import axios from "axios";

const uniSubgraphUrl = "https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2"

const execute = async (query: string, variable = {}) => {
  const response = await axios.post(uniSubgraphUrl, {
    query,
    variable,
    crossdomain: true,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "json",
    }
  });

  if (response.status === 200) return response.data.data;
  else return null;
};

export const getCurrentLiquidityPositions = (users: Address[]) => {

  console.log(JSON.stringify(users))
  
  const query = `query{
    liquidityPositions (
      where: {
        user_in: ${JSON.stringify(users)}
        liquidityTokenBalance_gt: 0
      }
    ) {
      pair{
        id
        token0{
          symbol
        }
        token1 {
          symbol
        }
      }
    }
  }`;

  return execute(query);
}