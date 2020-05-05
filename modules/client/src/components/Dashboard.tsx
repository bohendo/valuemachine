import React, { useState, useEffect } from 'react';

import {
  Event,
  Log,
  LogTypes,
} from "@finances/types";
import {
  getAddressBook,
  getEvents,
  getValueMachine,
} from "@finances/core";
import {
  AppBar,
  Container,
  CssBaseline,
  Grid,
  IconButton,
  Theme,
  Toolbar,
  Typography,
  createStyles,
  makeStyles,
} from '@material-ui/core';

import { AssetDistribution } from './AssetDistribution';
import { DateTime } from './DateTimePicker'
import { EventTable } from './EventTable'
import { NetWorth } from './NetWorthGraph';
import { TransactionLogs } from './TransactionLogs'

import * as cache from '../utils/cache';

import chainData from '../data/chain-data.json';

const inTypes = [
  LogTypes.Borrow,
  LogTypes.GiftIn,
  LogTypes.Income,
  LogTypes.Mint,
  LogTypes.SwapIn,
  LogTypes.Withdraw,
];

const outTypes = [
  LogTypes.Burn,
  LogTypes.Deposit,
  LogTypes.Expense,
  LogTypes.GiftOut,
  LogTypes.Repay,
  LogTypes.SwapOut,
];

export const Dashboard: React.FC = (props: any) => {
  //return <> Hello WOrld </>
  const [addressBook, setAddressBook] = useState({} as any);
  const [endDate, setEndDate] = useState(new Date());
  const [filteredTotalByCategory, setFilteredTotalByCategory] = useState({} as TotalByCategoryPerAssetType);
  const [financialEvents, setFinancialEvents] = useState([] as Event[]);
  const [financialLogs, setFinancialLogs] = useState([] as Log[]);
  const [netWorthSnapshot, setNetWorthSnapshot] = useState(0);
  const [netWorthTimeline, setNetWorthTimeline] = useState([] as any[]);
  const [totalByAssetType, setTotalByAssetType] = useState({} as {[assetType: string]: number});

  useEffect(() => {
    let addressBookJson = cache.loadPersonal();
    if (addressBookJson) {
      setAddressBook(getAddressBook(addressBookJson));
    }
    console.log(addressBookJson);
  }, []);

  useEffect(() => {
    (async () => {
      const events = await getEvents(
        addressBook,
        chainData,
        cache,
        [],
        console,
      );
      setFinancialEvents(events);

      const valueMachine = getValueMachine(addressBook);

      let state = cache.loadState();
      let vmLogs = cache.loadLogs();
      for (const event of events.filter(
        event => new Date(event.date).getTime() > new Date(state.lastUpdated).getTime(),
      )) {
        const [newState, newLogs] = valueMachine(state, event);
        vmLogs = vmLogs.concat(...newLogs);
        state = newState;
        cache.saveState(state);
        cache.saveLogs(vmLogs);
      }
      setFinancialLogs(vmLogs);

    })();
  }, [addressBook]);

  useEffect(() => {
    let totalByCategory = {};
    let tempTotalByAssetType = {};
    financialLogs.filter(log => new Date(log.date).getTime() <= endDate.getTime()).forEach((log: Log) => {
      if (!log.assetType) return;
      if (!totalByCategory[log.type]) {
        totalByCategory[log.type] = {};
      }
      if (!totalByCategory[log.type][log.assetType]) {
        totalByCategory[log.type][log.assetType] = 0;
      }

      totalByCategory[log.type][log.assetType] += parseFloat(log.quantity);
      if (!tempTotalByAssetType[log.assetType]) {
        tempTotalByAssetType[log.assetType] = 0;
      }
      if (inTypes.includes(log.type)) {
        tempTotalByAssetType[log.assetType] += parseFloat(log.quantity);
      } else if (outTypes.includes(log.type)) {
        tempTotalByAssetType[log.assetType] -= parseFloat(log.quantity);
      }
    })
    for (const assetType of Object.keys(tempTotalByAssetType)) {
      if (tempTotalByAssetType[assetType] === 0) {
        delete tempTotalByAssetType[assetType];
        for (const logType of Object.keys(totalByCategory)) {
          delete totalByCategory[logType][assetType];
        }
      }
    }
    setFilteredTotalByCategory(totalByCategory);
    setTotalByAssetType(tempTotalByAssetType);

    const recentPrices = {};
    const netWorthData = financialLogs
      .filter(log => new Date(log.date).getTime() <= endDate.getTime())
      .filter(log => log.type === LogTypes.NetWorth)
      .map((log: Log, index: number) => {
        let total = 0;
        for (const assetType of Object.keys(log.assets )) {
          recentPrices[assetType] = log.prices[assetType] || recentPrices[assetType];
          total += parseFloat(log.assets[assetType]) * parseFloat(recentPrices[assetType]);
        }
        return { date: new Date(log.date), networth: total };
      });

    setNetWorthTimeline(netWorthData);

    if (netWorthData.length > 0) {
      setNetWorthSnapshot(netWorthData[netWorthData.length - 1].networth);
    }

  }, [financialLogs, endDate]);

  return (
    <>
      <Grid container spacing={3}>
        <Grid item xs={6} md={6} lg={6}>
          <Typography>
            Account Overview
          </Typography>
        </Grid>
        <Grid item xs={6} md={6} lg={6}>
          <DateTime date={endDate} label="View Net Worth As of" setDate={setEndDate}/>
        </Grid>
        <Grid item xs={6} md={6} lg={6}>
          <Typography>
            Net Worth
          </Typography>
        </Grid>
        <Grid item xs={6} md={6} lg={6}>
          <Typography>
            $ {netWorthSnapshot}
          </Typography>
        </Grid>
        <Grid item xs={12} md={8} lg={9}>
          <NetWorth netWorthTimeline={netWorthTimeline} endDate={endDate}/>
        </Grid>
        <Grid item xs={12} md={4} lg={3}>
          <AssetDistribution totalByAssetType={totalByAssetType} date={endDate.toISOString()}/>
        </Grid>
        <Grid container>
          <TransactionLogs addressBook={addressBook} financialEvents={financialEvents} />
        </Grid>
        <Grid item xs={12} md={12} lg={12}>
          <EventTable filteredTotalByCategory={filteredTotalByCategory} totalByAssetType={totalByAssetType}/>
        </Grid>
      </Grid>
    </>
  )
}
