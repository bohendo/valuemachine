import React, { useState } from 'react';
import { Event } from '@finances/types';

import { Grid, } from '@material-ui/core';

import { EthTransactionLogsTable } from './EthTransactionLogsTable'
import { EthTransactionLogsFilter } from './EthTransactionLogsFilter'

export const EthTransactionLogs = (props: any) => {
  const [filteredEvents, setFilteredEvents] = useState([] as Array<Event>);

  return (
    <>
      <Grid item xs={12} md={3} lg={3}>
        <EthTransactionLogsFilter
          financialEvents={props.financialEvents}
          setFilteredEvents={setFilteredEvents}
        />
      </Grid>
      <Grid item xs={12} md={9} lg={9}>
        <EthTransactionLogsTable addressBook={props.addressBook} filteredEvents={filteredEvents} />
      </Grid>
    </>
  )
}
