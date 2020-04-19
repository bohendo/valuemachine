import React, { useState, useEffect } from 'react';
import {
  AssetTypes,
  LogTypes,
} from "@finances/types";
import _ from 'lodash';

import {
  sumByToken,
} from '../utils/utils';

import { Event } from '../types';

import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableFooter,
  TableHead,
  TableRow,
} from '@material-ui/core';

const assetTypes = Object.keys(AssetTypes);

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

export const EventTable = (props: any) => {

  const [filteredTotalByCategory, setFilteredTotalByCategory] = useState({} as TotalByCategoryPerAssetType);
  const [totalByAssetType, setTotalByAssetType] = useState({} as {[assetType: string]: number});

  const { endDate, financialLogs } = props;

  useEffect(() => {
    let totalByCategory = {};
    let tempTotalByAssetType = {};
    financialLogs.forEach((log: Log) => {
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
    setFilteredTotalByCategory(totalByCategory);
    setTotalByAssetType(tempTotalByAssetType);
  }, [financialLogs, endDate]);

  if (!financialLogs) {
    return <> Loading! We will have event table shortly </>;
  }

  return (
    <TableContainer component={Paper}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell> Event </TableCell>
            {
              assetTypes.map((assetType: string) => (
                <TableCell align="right" key={assetType}> {assetType} </TableCell>
              ))
            }
          </TableRow>
        </TableHead>
        <TableBody>
          {Object.keys(filteredTotalByCategory).map(
            (row: string) => {
              return (
              <TableRow key={row}>
                <TableCell> {row} </TableCell>
                {
                  assetTypes.map((assetType: string) => (
                    <TableCell align="right" key={assetType}>
                     {_.round(filteredTotalByCategory[row][assetType], 2) || 0}
                    </TableCell>
                  ))
                }
              </TableRow>
              )
            }
          )}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell> Net Position </TableCell>
            {
              assetTypes.map((assetType: string) => (
                <TableCell align="right" key={assetType}>
                  {_.round(totalByAssetType[assetType], 2) || 0}
                </TableCell>
              ))
            }
          </TableRow>
        </TableFooter>
      </Table>
    </TableContainer>
  )
}
