import React, { useState, useEffect } from 'react';
import {
  AssetTypes,
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

export const EventTable = (props: any) => {

  const [filteredTotalByCategory, setFilteredTotalByCategory] = useState({} as TotalByCategoryPerAssetType);

  const {
    endDate,
    eventByCategory,
    financialLogs,
    netStandingByAssetTypeOn,
  } = props;

  useEffect(() => {
    let totalByCategory = {};
    financialLogs.forEach((log: Log) => {
      if (!totalByCategory[log.type]) {
        totalByCategory[log.type] = {};
      }
      if (!totalByCategory[log.type][log.assetType]) {
        totalByCategory[log.type][log.assetType] = 0;
      }
      totalByCategory[log.type][log.assetType] += parseFloat(log.quantity);
    })
    setFilteredTotalByCategory(totalByCategory);
  }, [financialLogs, endDate]);

  console.log(filteredTotalByCategory);
  if (netStandingByAssetTypeOn.length === 0 || !filteredTotalByCategory) {
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
                {() => {
                  let i = _.findIndex(netStandingByAssetTypeOn, (o: any) => o.asset === assetType)
                  if (i >= 0) {
                    return netStandingByAssetTypeOn[i].total;
                  }
                  return 0
                }}
                </TableCell>
              ))
            }
          </TableRow>
        </TableFooter>
      </Table>
    </TableContainer>
  )
}
