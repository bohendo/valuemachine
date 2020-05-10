import React, { useState, useEffect } from 'react';

import {
  Transaction,
  Event,
  EventTypes,
} from "@finances/types";
import { LevelLogger } from "@finances/utils";
import {
  getAddressBook,
  getChainData,
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

import chainDataJson from '../data/chain-data.json';

export const Dashboard: React.FC = (props: any) => {
  const [endDate, setEndDate] = useState(new Date());
  const [filteredTotalByCategory, setFilteredTotalByCategory] = useState({} as TotalByCategoryPerAssetType);
  const [transactions, setTransactions] = useState([] as Transaction[]);
  const [financialEvents, setFinancialEvents] = useState([] as Event[]);
  const [netWorthSnapshot, setNetWorthSnapshot] = useState(0);
  const [netWorthTimeline, setNetWorthTimeline] = useState([] as any[]);
  const [totalByAssetType, setTotalByAssetType] = useState({} as {[assetType: string]: number});

  const { addressBook } = props;

  useEffect(() => {
    (async () => {
      if (Object.keys(addressBook).length === 0) {
        return;
      }
      const logger = new LevelLogger();
      const newTransactions = await mergeEthTransactions(
        [], // Could give transactions & this function will merge new txns into the existing array
        addressBook,
        // getChainData returns chain data access methods eg chainData.getAddressHistory
        getChainData({ store, logger, etherscanKey: "etherscanKey", chainDataJson }),
        0, // Only consider merging transactions after this time
        logger,
      );

      for (let i = 0; i < newTransactions.length; i++) {
        const tx = newTransactions[i];
        const assets = Array.from(new Set(tx.transfers.map(a => a.assetType)));
        for (let j = 0; j < assets.length; j++) {
          const assetType = assets[j] as AssetTypes;
          if (!tx.prices[assetType]) {
            tx.prices[assetType] = await getPrices(
              store,
              logger,
            ).getPrice(assetType, tx.date);
          }
        }
      }

      setTransactions(newTransactions);

      const valueMachine = getValueMachine(addressBook);

      let state = store.load(StoreKeys.State);
      let vmEvents = store.load(StoreKeys.Event);
      for (const transaction of newTransactions.filter(
        tx => new Date(tx.date).getTime() > new Date(state.lastUpdated).getTime(),
      )) {
        const [newState, newEvents] = valueMachine(state, transaction);
        vmEvents = vmEvents.concat(...newEvents);
        state = newState;
        store.save(StoreKeys.State, state);
        store.save(StoreKeys.Events, vmEvents);
      }
      setFinancialEvents(vmEvents);

    })();
  }, [addressBook]);

  useEffect(() => {
    let totalByCategory = {};
    let tempTotalByAssetType = {};
    financialEvents.filter(event => new Date(event.date).getTime() <= endDate.getTime()).forEach((event: Event) => {
      if (!event.assetType) return;
      if (!totalByCategory[event.type]) {
        totalByCategory[event.type] = {};
      }
      if (!totalByCategory[event.type][event.assetType]) {
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
    for (const assetType of Object.keys(tempTotalByAssetType)) {
      if (tempTotalByAssetType[assetType] === 0) {
        delete tempTotalByAssetType[assetType];
        for (const eventType of Object.keys(totalByCategory)) {
          delete totalByCategory[eventType][assetType];
        }
      }
    }
    setFilteredTotalByCategory(totalByCategory);
    setTotalByAssetType(tempTotalByAssetType);

    const recentPrices = {};
    const netWorthData = financialEvents
      .filter(event => new Date(event.date).getTime() <= endDate.getTime())
      .filter(event => event.type === EventTypes.NetWorth)
      .map((event: Event, index: number) => {
        let total = 0;
        for (const assetType of Object.keys(event.assets )) {
          recentPrices[assetType] = event.prices[assetType] || recentPrices[assetType];
          total += parseFloat(event.assets[assetType]) * parseFloat(recentPrices[assetType]);
        }
        return { date: new Date(event.date), networth: total };
      });

    setNetWorthTimeline(netWorthData);
    console.log(netWorthData);

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
        <EthTransactionLogs financialEvents={financialEvents} addressBook={addressBook} transactions={transactions} />
      </Grid>
      <Grid item xs={12} md={12} lg={12}>
        <EventTable filteredTotalByCategory={filteredTotalByCategory} totalByAssetType={totalByAssetType}/>
      </Grid>
    </Grid>
  )
}
