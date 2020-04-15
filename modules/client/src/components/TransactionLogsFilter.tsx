import React, { useState, useEffect } from 'react';
import _ from 'lodash';
import { Event } from '../types';

import {
  Checkbox,
  Divider,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormLabel,
  Theme,
  createStyles,
  makeStyles,
} from '@material-ui/core';

import { DateTime } from './DateTimePicker'

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      display: 'flex',
    },
    formControl: {
      margin: theme.spacing(3),
    },
  }),
);

export const TransactionLogsFilter = (props: any) => {
  const { allEvent, setFilteredEvents } = props
  const classes = useStyles();

  const [startDate, setStartDate] = useState(new Date("November 30, 2018 00:00:00"));
  const [endDate, setEndDate] = useState(new Date("December 30, 2018 00:00:00"));
  const [categories, setCategories] = useState({
    'all': true,
    'borrow': false,
    'cashout': false,
    'deposit': false,
    'expense': false,
    'giftGiven': false,
    'giftReceived': false,
    'income': false,
    'repay': false,
    'supply': false,
    'supply/repay': false,
    'swapIn': false,
    'swapOut': false,
    'withdraw': false,
    'withdraw/borrow': false,
  });
  const [assets, setAssets] = useState({
    all: true,
    BAT: false,
    DAI: false,
    ETH: false,
    GEN: false,
    MKR: false,
    REP: false,
    SAI: false,
    SNT: false,
    WETH: false,
  });

  const handleCategoryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCategories({...categories, [event.target.name]: event.target.checked})
  };

  const handleAssetChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAssets({...assets, [event.target.name]: event.target.checked})
  };

  useEffect(() => {
    let t = _.filter(
      allEvent,
      (event: Event) => 
        event.date >= startDate.toISOString() &&
        event.date <= endDate.toISOString() &&
        (categories.all || (categories as any)[event.category]) &&
        (assets.all || (assets as any)[event.type])
    )
    setFilteredEvents(t)
  }, [allEvent, startDate, endDate, categories, assets, setFilteredEvents]);

  return (
    <>
      <DateTime date={startDate} label="Select Log Start Date" setDate={setStartDate}/>
      <DateTime date={endDate} label="Select Log End Date" setDate={setEndDate}/>

      <Divider />
      <FormControl component="fieldset" className={classes.formControl}>
        <FormLabel component="legend">Select Category</FormLabel>
        <FormGroup row>
          {Object.keys(categories).map((key: string) => (
            <FormControlLabel
              control={
                <Checkbox
                  checked={(categories as any)[key]}
                  onChange={handleCategoryChange}
                  name={key}
                />
              }
              label={key}
              key={key}
            />
          ))}
        </FormGroup>
      </FormControl>
      <Divider />
      <FormControl component="fieldset" className={classes.formControl}>
        <FormLabel component="legend">Select Assets</FormLabel>
        <FormGroup row>
          {Object.keys(assets).map((key: string) => (
            <FormControlLabel
              control={
                <Checkbox
                  checked={(assets as any)[key]}
                  onChange={handleAssetChange}
                  name={key}
                />
              }
              label={key}
              key={key}
            />
          ))}
        </FormGroup>
      </FormControl>
    </>
  )
}

