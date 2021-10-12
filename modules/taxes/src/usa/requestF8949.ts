import { getPrices } from "@valuemachine/core";
import { Assets } from "@valuemachine/transactions";
import { EventTypes, TradeEvent, Guard, Prices, ValueMachine } from "@valuemachine/types";
import { getLogger, getLocalStore } from "@valuemachine/utils";
import axios from "axios";

const log = getLogger("info").child({ module: "Taxes" });

export const requestF8949 = async (
  vm: ValueMachine,
  prices: Prices,
  guard: Guard,
  taxYear: string,
  window: any,
) => {
  if (!vm?.json?.chunks?.length || !prices.json || !guard || !taxYear) {
    log.warn(`Missing args, not requesting f8949`);
    return;
  }
  const store = getLocalStore(window.localStorage);
  const usdPrices = getPrices({
    json: prices.json,
    logger: log,
    store,
    unit: Assets.USD,
  });
  const getDate = (timestamp: string): string => timestamp.split("T")[0];
  const trades = [];

  // TODO: merge chunks w the same receiveDate + disposeDate
  for (const event of vm.json.events) {
    if (event.type !== EventTypes.Trade || event.account?.startsWith(`${guard}/`)) continue;
    for (const chunkIndex of (event as TradeEvent).outputs) {
      const chunk = vm.getChunk(chunkIndex);
      if (chunk.disposeDate?.startsWith(taxYear)) {
        const purchaseDate = getDate(chunk.history[0].date);
        const receivePrice = usdPrices.getNearest(purchaseDate, chunk.asset);
        const assetPrice = usdPrices.getNearest(chunk.disposeDate, chunk.asset);
        if (receivePrice !== assetPrice) {
          trades.push({
            date: getDate(chunk.disposeDate),
            asset: chunk.asset,
            receivePrice,
            assetPrice,
            purchaseDate: purchaseDate,
            amount: chunk.amount,
          });
        }
      }
    }
  }

  if (trades.length) {
    axios({
      url: "/api/taxes/f8949",
      method: "post",
      responseType: "blob",
      data: { trades },
    }).then((response) => {
      const url = window.URL.createObjectURL(new window.Blob([response.data]));
      const link = window.document.createElement("a");
      link.href = url;
      link.setAttribute("download", "f8949.pdf");
      window.document.body.appendChild(link);
      link.click();
    }).catch(async () => {
      await new Promise(res => setTimeout(res, 2000));
    });
  } else {
    await new Promise(res => setTimeout(res, 2000));
  }
};
