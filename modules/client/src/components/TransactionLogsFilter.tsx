import React, { useState, useEffect } from "react";
import { AssetTypes, Transaction, Transfer, TransferCategories } from "@finances/types";
import { math } from "@finances/utils";
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
} from "@material-ui/core";

import { DateTime } from "./DateTimePicker";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      display: "flex",
    },
    formControl: {
      margin: theme.spacing(3),
    },
  }),
);

const allCategories = { all: true };
Object.keys(TransferCategories).forEach(category => { allCategories[category] = false; });

const allAssets = { all: true };
Object.keys(AssetTypes).forEach(asset => { allAssets[asset] = false; });

export const EthTransactionLogsFilter = (props: any) => {
  const { transactions, setFilteredTransactions } = props;

  const classes = useStyles();

  const [startDate, setStartDate] = useState(new Date(0));
  const [endDate, setEndDate] = useState(new Date());

  const [categories, setCategories] = useState(allCategories);

  const [assets, setAssets] = useState(allAssets);

  const handleCategoryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCategories({ ...categories, [event.target.name]: event.target.checked });
  };

  const handleAssetChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAssets({ ...assets, [event.target.name]: event.target.checked });
  };

  useEffect(() => {
    const temp = [];

    transactions.forEach((transaction: Transaction) => {
      if (
        transaction.date < startDate.toISOString() ||
        transaction.date > endDate.toISOString()
      ) return;
      
      transaction.transfers.forEach((transfer: Transfer) => {
        if(
          math.gt(transfer.quantity, "0") &&
          (categories.all || categories[transfer.category]) &&
          (assets.all || assets[transfer.assetType])
        ) {
          temp.push({
            ...transfer,
            date: transaction.date,
            hash: transaction.hash,
            value: parseFloat(transaction.prices[transfer.assetType])
              * parseFloat(transfer.quantity)
          });
        }
      });
    });

    setFilteredTransactions(temp);
  }, [transactions, startDate, endDate, categories, assets, setFilteredTransactions]);

  return (
    <>
      <DateTime date={startDate} label="Select Log Start Date" setDate={setStartDate}/>
      <DateTime date={endDate} label="Select Log End Date" setDate={setEndDate}/>

      <Divider />
      <FormControl component="fieldset" className={classes.formControl}>
        <FormLabel component="legend">Select Categories</FormLabel>
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
                  checked={assets[key]}
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
  );
};
