import React, { useState, useEffect } from 'react';
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

export const EventTable = (props: any) => {

  const [filteredEventByCategory, setFilteredEventByCategory] = useState({} as any);
  const {
    assetTypes,
    endDate,
    eventByCategory,
    netStandingByAssetTypeOn,
  } = props;

  useEffect(() => {

    if (eventByCategory && endDate) {
      let temp = {} as any
      Object.keys(eventByCategory).forEach((category: string) => {
        Object.keys(eventByCategory[category]).forEach((assetType: string) => {
          if (!temp[category]) temp[category] = {}
          temp[category][assetType] = _.dropRightWhile(
            eventByCategory[category][assetType],
            (event: Event) => event.date > endDate
          )
        })
      })

      setFilteredEventByCategory(temp)
    }
  }, [eventByCategory, endDate]);

  if (netStandingByAssetTypeOn.length === 0 || !filteredEventByCategory || !assetTypes) {
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
          {Object.keys(filteredEventByCategory).map(
            (row: string) => {
              return (
              <TableRow key={row}>
                <TableCell> {row} </TableCell>
                {
                  assetTypes.map((assetType: string) => (
                    <TableCell align="right" key={assetType}> {_.round(sumByToken(assetType, filteredEventByCategory[row]), 2)} </TableCell>
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
