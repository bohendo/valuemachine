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

  const { filteredTotalByCategory, totalByAssetType } = props;

  if (!Object.keys(filteredTotalByCategory).length === 0) {
    return <> Loading! We will have event table shortly </>;
  }

  return (
    <TableContainer component={Paper}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell> Event </TableCell>
            {
              Object.keys(totalByAssetType).map((assetType: string) => (
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
                  Object.keys(totalByAssetType).map((assetType: string) => (
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
              Object.keys(totalByAssetType).map((assetType: string) => (
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
