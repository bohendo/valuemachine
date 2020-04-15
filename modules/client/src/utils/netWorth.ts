import _ from 'lodash';
import {
  AssetTotal,
  Event,
  NetGraphData,
} from '../types';
import { In, mergeArray } from './utils';

const emptyNetGraphData = { lastUpdated: '', netWorth: {} } as NetGraphData;

const loadCacheNetGraphData = (): NetGraphData => {
  try {
    let netGraphData = localStorage.getItem('netGraphData');
    if (netGraphData) return JSON.parse(netGraphData);
    return emptyNetGraphData
  } catch (e) {
    return emptyNetGraphData;
  }
}

const saveCache = (netGraphData: NetGraphData): void =>
  localStorage.setItem('netGraphData', JSON.stringify(netGraphData))

export const getNetWorthData = (
  allEvent: Array<Event>
): NetGraphData => {

  const getPositionChangeFor = (
    events: Array<Event>
  ): AssetTotal => {
    let temp = {} as AssetTotal

    events.forEach((event: Event) => {
      if (In.includes(event.category)) {
        try {
          temp[event.type][0] = temp[event.type][0] + Number(event.amount)
        } catch (e) {
          temp[event.type] = [Number(event.amount),0,0]
        }
      } else {
        try {
          temp[event.type][0] = temp[event.type][0] - Number(event.amount)
        } catch (e) {
          temp[event.type] = [-1*Number(event.amount),0,0]
        }
      }

      if (event.category === 'borrow')
        temp[event.type][2] += Number(event.amount);
      else if (event.category === 'repay')
        temp[event.type][2] -= Number(event.amount);
      else if (event.category === 'supply')
        temp[event.type][1] += Number(event.amount);
      else if (event.category === 'withdraw')
        temp[event.type][1] -= Number(event.amount);
    })
    return temp
  }

  const mergeChanges = (
    cOld: AssetTotal,
    cNew: AssetTotal
  ): AssetTotal => {
    let keys = mergeArray(Object.keys(cOld), Object.keys(cNew));
    let result = {} as AssetTotal;
    keys.forEach((k: string) => {
      if (cOld[k] && cNew[k]) {
        result[k] = [
          cOld[k][0] + cNew[k][0],
          cOld[k][1] + cNew[k][1],
          cOld[k][2] + cNew[k][2],
        ];
      } else if (cOld[k]) result[k] = cOld[k];
      else if (cNew[k]) result[k] = cNew[k];
    })

    return result;
  }

  const getAssetTotal = ( events: Array<Event>): AssetTotal => {
    if (events.length === 0) return {} as AssetTotal;

    const current = events[events.length -1].date.slice(0,10);
    const splitIndex = _.findLastIndex(
      events,
      (event: Event) => event.date.slice(0,10) === current
    )

    if (netGraphData.netWorth[current]) {
      netGraphData.netWorth[current] = mergeChanges(
          netGraphData.netWorth[current],
          getPositionChangeFor(events.slice(splitIndex))
        );
    } else if (splitIndex === 0) {
      netGraphData.netWorth[current] = getPositionChangeFor(events.slice(splitIndex));
    } else {
      netGraphData.netWorth[current] =  mergeChanges(
        getAssetTotal(events.slice(0,splitIndex)),
        getPositionChangeFor(events.slice(splitIndex))
      );
    }
    return netGraphData.netWorth[current];
  }

  if (!allEvent || allEvent.length === 0) return {} as NetGraphData;

  const netGraphData = loadCacheNetGraphData() as NetGraphData;
  const latest = allEvent[allEvent.length -1].date;
  let assetTotal: AssetTotal;

  // Same date new event??
  if (
    netGraphData &&
    netGraphData.lastUpdated === latest
  ) return netGraphData;

  if (netGraphData.lastUpdated === undefined) {
    console.log('undefined');
    assetTotal = getAssetTotal(allEvent);
  } else {
    const newEvents = _.takeRightWhile(allEvent, (e: Event) => e.date > netGraphData.lastUpdated);
    assetTotal = getAssetTotal(newEvents);
  }

  console.log(assetTotal)
  netGraphData.lastUpdated = latest
  saveCache(netGraphData);

  return netGraphData
}
