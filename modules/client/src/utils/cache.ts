import {
  ChainData,
  PriceData,
  emptyChainData,
  emptyPriceData,
} from "@finances/types";

export const emptyData = {

};

const load = (key: string) => {
  try {
    let data = localStorage.getItem(key)
    if (data) return JSON.parse(data)
    return emptyPriceData;
  } catch (e) {
      return emptyPriceData;
  }
}

const loadPrices = () : PriceData => {
  console.log('Loading Prices');
  try {
    let priceData = localStorage.getItem('priceData')
    if (priceData) return JSON.parse(priceData)
    return emptyPriceData;
  } catch (e) {
      return emptyPriceData;
  }
};

const savePrices = (priceData: PriceData): void => {
  console.log('Saving Prices');
  localStorage.setItem('priceData', JSON.stringify(priceData))
}

export { loadPrices, savePrices };
