#!/bin/python

from collections import defaultdict
import csv
import sys

year = 17

total_proceeds = 0
total_cost = 0
total_profit = 0

assets = defaultdict(list)

with open(sys.argv[1], 'rb') as csvfile:
  reader = csv.DictReader(csvfile) #, delimiter=',', quotechar='"')

  for row in reader:
    if row['date'][-2:] == str(year):

      if row['type'] == "Buy":

        # print ('Buying {} {} at {}'.format(row['quantity'], row['asset'], row['price']))

        assets[row['asset']].append({
          "quantity": float(row['quantity']),
          "price": float(row['price'])
        })

      if row['type'] == "Sell":

        profit = 0
        cost = 0

        amt = float(row['quantity'])

        while True:

          if amt == 0:
            break

          asset = assets[row['asset']][0]
  
          # sell off part of an asset
          if asset['quantity'] > amt:
            profit += ( (amt * float(row['price'])) - (amt * asset['price']) )
            cost += asset['price'] * amt
            asset['quantity'] -= amt
            break

          # sell off an entire asset
          else:
            profit += (float(row['price']) - asset['price']) * asset['quantity']
            cost += asset['price'] * asset['quantity']
            amt -= asset['quantity']
            assets[row['asset']].pop(0)

        print ('Sold {} {}\ton {}\tfor {}\tPurchased for {}\t= profit of {}'.format(row['quantity'], row['asset'], row['date'], round(float(row['price']) * float(row['quantity']), 2), round(cost,2), round(profit,2)))

        total_proceeds += float(row['quantity']) * float(row['price'])
        total_cost += cost
        total_profit += profit

  print ('Totals:\t proceeds: {}\t cost: {}\t profit: {}'.format(round(total_proceeds,2), round(total_cost,2), round(total_profit,2)))

