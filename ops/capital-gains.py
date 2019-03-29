#!/bin/python
from collections import defaultdict
import csv
import json
import sys

debug=False
year=18

total_proceeds = 0
total_cost = 0
total_profit = 0

def printAssets(assets):
  totals = {}
  msg = ""
  for asset in assets:
    totals[asset] = 0
    for lump in assets[asset]:
      totals[asset] += lump["quantity"]
    msg += " [" + asset + " " + str(totals[asset]) + "] "
  return(msg)

with open(sys.argv[1], 'rb') as starting_assets:
  assets = json.load(starting_assets)

print("Starting Assets:" + printAssets(assets))

with open(sys.argv[2], 'rb') as csvfile:
  reader = csv.DictReader(csvfile) #, delimiter=',', quotechar='"')

  for row in reader:


    if row['timestamp'][:2] == str(year):

      if debug:
        print('Assets: ' + printAssets(assets))

      if row['from'] == "coinbase" or row['from'][:6] == "entity":

        if debug and row['from'][:6] == "entity":
          print('Received {} {} from {} at {} on {}'.format(row['quantity'], row['asset'], row['from'],  row['price'], row['timestamp']))
        elif debug:
          print('Bought {} {} at {} on {}'.format(row['quantity'], row['asset'], row['price'], row['timestamp']))

        assets[row['asset']].append({
          "quantity": float(row['quantity']),
          "price": float(row['price'])
        })

      elif row['to'] == "coinbase" or row['to'][:6] == "entity":

        if debug and row['to'][:6] == "entity":
          print('Sent {} {} to {} at {} on {}'.format(row['quantity'], row['asset'], row['to'], row['price'], row['timestamp']))
        elif debug:
          print('Sold {} {} at {} on {}'.format(row['quantity'], row['asset'], row['price'], row['timestamp']))

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

        print('Sold {} {}\ton {}\tfor  {}\tPurchased for {}\t= profit of {}'.format(round(float(row['quantity']), 3), row['asset'], row['timestamp'], round(float(row['price']) * float(row['quantity']), 2), round(cost,2), round(profit,2)))

        total_proceeds += float(row['quantity']) * float(row['price'])
        total_cost += cost
        total_profit += profit

      elif debug:
        print('idk what to do with tx from %s to %s' % (row['from'], row['to']))

    else:
      print("invalid row")

  print('Totals:\t proceeds: {}\t cost: {}\t profit: {}'.format(round(total_proceeds,2), round(total_cost,2), round(total_profit,2)))

print('Assets leftover:' + printAssets(assets))
