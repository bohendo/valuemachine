import _ from 'lodash';
import { In, Out } from './utils';
import {
  OldEvent,
} from '../types';

const netWorth = [{
  'date': '2017-01-01T00:00:00.000Z',
  'debt': 0,
  'investment': 0,
  'networth': 0,
}]

export const getNetWorthOverTimeAll = (allEvent: Array<OldEvent>) => {
  let debt = 0
  let networth = 0
  let investment = 0
  if (allEvent.length > 0) {
    //console.log(allEvent)
    return allEvent.map((event: OldEvent, i: number) => {
      let date = event.date
      let value = Number(event.amount);
      let price = Number(event.price);

      if (In.includes(event.category)) {
        networth += value * price
      } else if(Out.includes(event.category)){
        networth -= value * price
      }

      if (event.category === 'borrow') {
        debt += value * price;
      } else if (event.category === 'repay') {
        debt -= value * price;
      }

      if (event.category === "supply") {
        investment += value * price;
      } else if (event.category === "withdraw") {
        investment -= value * price;
      }

      return {
        date: new Date(date),
        debt,
        networth,
        investment,
      }
    });
  } else return []
}

export const getNetWorthOverTimeTill = (networthAll: any, endDate: string) => {
  //TODO: resolve promise
  //console.log(events)
  //console.log(endDate)
  //console.log(getNetWorthOverTimeAll(events))

  let dateO = new Date(endDate)
  if (networthAll.length > 0) {
    return _.dropRightWhile(networthAll, (net: any) => {
      return net.date > dateO
    });
  }
  return netWorth;
}
