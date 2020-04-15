import { PriceData } from '@finances/types';

const emptyPriceData = {ids: {} };

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
