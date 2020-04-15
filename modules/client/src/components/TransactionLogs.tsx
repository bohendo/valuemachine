import React, { useState } from 'react';
import { Event } from '../types';

import { Grid, } from '@material-ui/core';

import { TransactionLogsTable } from './TransactionLogsTable'
import { TransactionLogsFilter } from './TransactionLogsFilter'

export const TransactionLogs = (props: any) => {
  const [filteredEvents, setFilteredEvents] = useState([] as Array<Event>);

  return (
    <>
      <Grid item xs={12} md={3} lg={3}>
        <TransactionLogsFilter
          allEvent={props.allEvent}
          setFilteredEvents={setFilteredEvents}
        />
      </Grid>
      <Grid item xs={12} md={9} lg={9}>
        <TransactionLogsTable filteredEvents={filteredEvents} />
      </Grid>
    </>
  )
}
