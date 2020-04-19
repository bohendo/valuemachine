import React, { useState, useEffect } from 'react';

import {
  AssetTotal,
  AssetTypes,
  ChainData,
  Event,
  Log,
  LogTypes,
  NetGraphData,
} from "@finances/types";
import {
  getAddressBook,
  getEvents,
  getState,
  getValueMachine,
} from "@finances/core";
import {
  AppBar,
  Container,
  CssBaseline,
  Grid,
  Theme,
  Typography,
  createStyles,
  makeStyles,
} from '@material-ui/core';

import * as cache from './utils/cache';
import { NetWorth } from './components/NetWorthGraph';
import { AssetDistribution } from './components/AssetDistribution';
import { DateTime } from './components/DateTimePicker'
import { EventTable } from './components/EventTable'
import { TransactionLogs } from './components/TransactionLogs'

import personal from './data/personal.json';
import chainData from './data/chain-data.json';

//import { getParsedPersonal } from './utils/parse';
import {
  getAllEvent,
  getFilteredChainData,
  getAllAssetTypes,
  getEventCategoryByAssetType,
  getNetWorthOn,
  getNetStanding,
} from './utils/getters';

import { getNetWorthData } from './utils/netWorth';

import {
  AddressBook,
  OldEvent,
  EventByCategoryPerAssetType,
} from './types';

const useStyles = makeStyles((theme: Theme) => createStyles({
  root: {
    backgroundColor: "linen",
  },
  content: {
    flexGrow: 1,
    height: '100vh',
    overflow: 'auto',
  },
  container: {
    paddingTop: theme.spacing(4),
    paddingBottom: theme.spacing(4),
  },
  main: {
    marginTop: "80px",
  },
  title: {
    flexGrow: 1,
  },
}));

const inTypes = [
  LogTypes.Borrow,
  LogTypes.GiftIn,
  LogTypes.Income,
  LogTypes.Mint,
  LogTypes.SwapIn,
  LogTypes.Unlock,
  LogTypes.Withdraw,
];

const outTypes = [
  LogTypes.Burn,
  LogTypes.Deposit,
  LogTypes.Expense,
  LogTypes.GiftOut,
  LogTypes.Lock,
  LogTypes.Repay,
  LogTypes.SwapOut,
];

function App() {
  const classes = useStyles();
  const [addressBook, setAddressBook] = useState({} as AddressBook);
  const [data, setData] = useState({} as ChainData);
  const [endDate, setEndDate] = useState(new Date());
  const [filteredTotalByCategory, setFilteredTotalByCategory] = useState({} as TotalByCategoryPerAssetType);
  const [financialEvents, setFinancialEvents] = useState([] as Event[]);
  const [financialLogs, setFinancialLogs] = useState([] as Log[]);
  const [netStandingByAssetTypeOn, setNetStandingByAssetTypeOn] = useState([] as { assetType: string; total: number; totalUSD: number; }[])
  const [netWorthSnapshot, setNetWorthSnapshot] = useState(0);
  const [netWorthTimeline, setNetWorthTimeline] = useState([] as any[]);
  const [totalByAssetType, setTotalByAssetType] = useState({} as {[assetType: string]: number});

  useEffect(() => {
    (async () => {
      const addressBook = getAddressBook(personal.addressBook);
      setAddressBook(addressBook);
      const events = await getEvents(
        addressBook,
        chainData,
        cache,
        [],
        console,
      );
      setFinancialEvents(events);

      const valueMachine = getValueMachine(addressBook);

      let state = getState(addressBook, cache.loadState());
      let vmLogs = cache.loadLogs();
      for (const event of events.filter(
        event => new Date(event.date).getTime() > new Date(state.toJson().lastUpdated).getTime(),
      )) {
        const [newState, newLogs] = valueMachine(state.toJson(), event);
        vmLogs = vmLogs.concat(...newLogs);
        state = newState;
        cache.saveState(state.toJson());
        cache.saveLogs(vmLogs);
      }
      setFinancialLogs(vmLogs);

    })();
  }, []);

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
    <div className={classes.root}>
      <CssBaseline />
      <AppBar position="absolute">
        <Typography component="h1" variant="h6" color="inherit" noWrap className={classes.title}>
          Dashboard
        </Typography>
      </AppBar>
      <main className={classes.content}>
        <Container maxWidth="lg" className={classes.container}>
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
        </Container>
      </main>
    </div>
  );
}

export default App;
