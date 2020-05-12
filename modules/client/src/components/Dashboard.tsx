import React, { useState, useEffect } from 'react';

import {
  AssetTypes,
  Event,
  EventTypes,
  StoreKeys,
  Transaction,
} from "@finances/types";
import { ContextLogger, LevelLogger } from "@finances/utils";
import {
  getPrices,
  getValueMachine,
  mergeEthTransactions,
} from "@finances/core";
import {
  Grid,
  Typography,
} from '@material-ui/core';

import { AssetDistribution } from './AssetDistribution';
import { DateTime } from './DateTimePicker'
import { EventTable } from './EventTable'
import { NetWorth } from './NetWorthGraph';
import { EthTransactionLogs } from './TransactionLogs'

import { inTypes, outTypes } from '../utils/utils';
import { store } from '../utils/cache';

export const Dashboard: React.FC = (props: any) => {
  const [endDate, setEndDate] = useState(new Date());
  const [filteredTotalByCategory, setFilteredTotalByCategory] = useState({} as TotalByCategoryPerAssetType);
  const [transactions, setTransactions] = useState([] as Transaction[]);
  const [financialEvents, setFinancialEvents] = useState([] as Event[]);
  const [netWorthSnapshot, setNetWorthSnapshot] = useState(0);
  const [netWorthTimeline, setNetWorthTimeline] = useState([] as any[]);
  const [totalByAssetType, setTotalByAssetType] = useState({} as {[assetType: string]: number});
  const [endDatePrice, setEndDatePrice] = useState({} as any[]);

  const { addressBook, chainData } = props;

  const logger = new LevelLogger(3);
  const prices = getPrices(store, logger);

  useEffect(() => {
    let currentPrices = {}
    Object.values(AssetTypes).forEach(async (assetType) => {
      currentPrices[assetType] = await prices.getPrice(assetType, endDate.toISOString());
    })
    setEndDatePrice(currentPrices);
  }, [endDate]);

  useEffect(() => {
    (async () => {
      if (Object.keys(addressBook).length === 0) {
        setFinancialEvents([] as Event[]);
        setTransactions([] as Transaction[]);
        return;
      }
      const log = new ContextLogger("Dashboard", logger);
      let newTransactions = await mergeEthTransactions(
        [], // Could give transactions & this function will merge new txns into the existing array
        addressBook,
        chainData,
        0, // Only consider merging transactions after this time
        logger,
      );

      log.info(`address book contains ${addressBook.addresses.filter(addressBook.isSelf).length} self addresses`);

      for (let i = 0; i < newTransactions.length; i++) {
        const tx = newTransactions[i];
        newTransactions[i].index = i+1;
        const assets = Array.from(new Set(tx.transfers.map(a => a.assetType)));
        for (let j = 0; j < assets.length; j++) {
          const assetType = assets[j] as AssetTypes;
          if (!tx.prices[assetType]) {
            tx.prices[assetType] = await prices.getPrice(assetType, tx.date);
          }
        }
      }

      setTransactions(newTransactions);
      store.save(StoreKeys.Transactions, newTransactions);

      const valueMachine = getValueMachine(addressBook, logger);

      let state = store.load(StoreKeys.State);
      let vmEvents = store.load(StoreKeys.Events);

      const filteredTransactions = newTransactions.filter(
        tx => new Date(tx.date).getTime() > new Date(state.lastUpdated).getTime(),
      )

      log.info(`Processing ${filteredTransactions.length} new transactions of ${newTransactions.length} total`);

      let start = Date.now();
      for (const transaction of filteredTransactions) {
        const [newState, newEvents] = valueMachine(state, transaction);
        vmEvents = vmEvents.concat(...newEvents);
        state = newState;
        const chunk = 100;
        if (transaction.index % chunk === 0) {
          const diff = (Date.now() - start).toString();
          log.info(`Processed transactions ${transaction.index - chunk}-${transaction.index} in ${diff} ms`);
          start = Date.now();
        }
      }
      store.save(StoreKeys.State, state);
      store.save(StoreKeys.Events, vmEvents);
      setFinancialEvents(vmEvents);

    })();
  }, [addressBook, chainData]);

  useEffect(() => {
    let totalByCategory = {};
    let tempTotalByAssetType = {};
    financialEvents.filter(event => new Date(event.date).getTime() <= endDate.getTime()).forEach((event: Event) => {
      if (!event.assetType) return;
      if (event.assetType.toLowerCase().startsWith('c')) {
        return;
      }
      if (!totalByCategory[event.type]) {
        totalByCategory[event.type] = {};
        totalByCategory[event.type][event.assetType] = 0;
      }
      else if (!totalByCategory[event.type][event.assetType]) {
        totalByCategory[event.type][event.assetType] = 0;
      }
      totalByCategory[event.type][event.assetType] += parseFloat(event.quantity);

      if (!tempTotalByAssetType[event.assetType]) {
        tempTotalByAssetType[event.assetType] = 0;
      }
      if (inTypes.includes(event.type)) {
        tempTotalByAssetType[event.assetType] += parseFloat(event.quantity);
      } else if (outTypes.includes(event.type)) {
        tempTotalByAssetType[event.assetType] -= parseFloat(event.quantity);
      }
    })
    if (totalByCategory[EventTypes.Withdraw]) {
      Object.keys(totalByCategory[EventTypes.Deposit]).forEach((assetType: AssetTypes) => {
        const interest =
          (totalByCategory[EventTypes.Withdraw][assetType] || 0) -
          (totalByCategory[EventTypes.Deposit][assetType] || 0)

          if (interest > 0) {
            console.log(`${interest} ${assetType} earned as interest`);
            tempTotalByAssetType[assetType] += interest
          }
      })
    }
    setFilteredTotalByCategory(totalByCategory);
    setTotalByAssetType(tempTotalByAssetType);

    /*
    const netWorthEvents = financialEvents
      .filter(event => new Date(event.date).getTime() <= endDate.getTime())
      .filter(event => event.type === EventTypes.NetWorth)
    console.log(netWorthEvents);
    */

    const recentPrices = {};
    const netWorthData = financialEvents
      .filter(event => new Date(event.date).getTime() <= endDate.getTime())
      .filter(event => event.type === EventTypes.NetWorth)
      .map((event: Event, index: number) => {
        let total = 0;
        for (const assetType of Object.keys(event.assets)) {
          recentPrices[assetType] = event.prices[assetType] || recentPrices[assetType];
          total += parseFloat(event.assets[assetType]) * parseFloat(recentPrices[assetType]);
        }
        return { date: new Date(event.date), networth: total };
      });

    if (netWorthData.length > 0 && netWorthData[netWorthData.length -1].date.toDateString() !== endDate.toDateString()) {
      let total = 0;
      for (const assetType of Object.keys(totalByAssetType)) {
        total += totalByAssetType[assetType] * parseFloat(endDatePrice[assetType]);
      }
      netWorthData.push({date: endDate, networth: total})
    }
    console.log(netWorthData);

    setNetWorthTimeline(netWorthData);

    if (netWorthData.length > 0) {
      setNetWorthSnapshot(netWorthData[netWorthData.length - 1].networth);
    }

  }, [financialEvents, endDate]);

  return (
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
        <EthTransactionLogs addressBook={addressBook} transactions={transactions} />
      </Grid>
      <Grid item xs={12} md={12} lg={12}>
        <EventTable filteredTotalByCategory={filteredTotalByCategory} totalByAssetType={totalByAssetType}/>
      </Grid>
    </Grid>
  )
}
