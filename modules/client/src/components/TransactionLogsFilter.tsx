import React, { useState, useEffect } from 'react';
import { AssetTypes, Event, Transfer, TransferTags } from '@finances/types';

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
  const { financialEvents, setFilteredEvents } = props

  const classes = useStyles();

  const [startDate, setStartDate] = useState(new Date("November 30, 2018 00:00:00"));
  const [endDate, setEndDate] = useState(new Date("December 30, 2018 00:00:00"));

  let allTags = { all: true };
  Object.keys(TransferTags).forEach(tag => { allTags[tag] = false })
  const [tags, setTags] = useState(allTags);

  let allAssets = { all: true };
  Object.keys(AssetTypes).forEach(asset => { allAssets[asset] = false })
  const [assets, setAssets] = useState(allAssets);

  const handleTagChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTags({...tags, [event.target.name]: event.target.checked})
  };

  const handleAssetChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAssets({...assets, [event.target.name]: event.target.checked})
  };

  useEffect(() => {
    let temp = [];

    financialEvents.forEach((event: Event) => {
      if (
        event.date < startDate.toISOString() ||
        event.date > endDate.toISOString()
      ) return;
      
      event.transfers.forEach((transfer: Transfer) => {
        if(
          (tags.all || transfer.tags.some(tag => tags[tag])) &&
          (assets.all || (assets as any)[transfer.assetType])
        ) {
          temp.push({
            ...transfer,
            date: event.date,
            hash: event.hash,
            value: parseFloat(event.prices[transfer.assetType]) * parseFloat(transfer.quantity)
          })
        }
      })
    });

    console.log(temp);
    setFilteredEvents(temp)
  }, [financialEvents, startDate, endDate, tags, assets, setFilteredEvents]);

  return (
    <>
      <DateTime date={startDate} label="Select Log Start Date" setDate={setStartDate}/>
      <DateTime date={endDate} label="Select Log End Date" setDate={setEndDate}/>

      <Divider />
      <FormControl component="fieldset" className={classes.formControl}>
        <FormLabel component="legend">Select Tags</FormLabel>
        <FormGroup row>
          {Object.keys(tags).map((key: string) => (
            <FormControlLabel
              control={
                <Checkbox
                  checked={(tags as any)[key]}
                  onChange={handleTagChange}
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
