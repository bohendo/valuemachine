#!/bin/python
import csv
import json
import sys

debug=False
year=18

def assetsToString(assets):
  totals = {}
  msg = ""
  for asset in assets:
    totals[asset] = 0
    for lump in assets[asset]:
      totals[asset] += lump["quantity"]
    msg += " [" + asset + " " + str(totals[asset]) + "] "
  return(msg)

########################################
# Read data from input files

assets = json.load(open(sys.argv[1], 'rb'))
personal_data = json.load(open(sys.argv[3], 'rb'))
tx_history = csv.DictReader(open(sys.argv[2], 'rb'))

print("Starting Assets:" + assetsToString(assets))

########################################
# Calculate Capital Gains/Losses

total_proceeds = 0
total_cost = 0
total_profit = 0
trades = []

for row in tx_history:

  if row['timestamp'][:2] != str(year):
    print("invalid row")
    continue

  if debug:
    print('Assets: ' + assetsToString(assets))

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

    proceeds = round(float(row['price']) * float(row['quantity']), 2)

    trades.append({
      'Description': '%s %s'  % (round(float(row['quantity']), 3), row['asset']),
      'DateAcquired': 'VARIOUS',
      'DateSold': row['timestamp'], # TODO: need MM, DD, YYYY format
      'Proceeds': proceeds,
      'Cost': round(cost, 2),
      'Code': '',
      'Adjustment': '',
      'GainOrLoss': round(profit, 2)
    })

    total_proceeds += float(row['quantity']) * float(row['price'])
    total_cost += cost
    total_profit += profit

  elif debug:
    print('idk what to do with tx from %s to %s' % (row['from'], row['to']))

########################################
# Print results of our calculations

print('')
for trade in trades:
  print('Sold %s\ton %s\tfor  %s\tPurchased for %s\t= profit of %s' % (
    trade['Description'], trade['DateSold'], trade['Proceeds'], trade['Cost'], trade['GainOrLoss']
  ))
print('\nTotals:\t proceeds: {}\t cost: {}\t profit: {}'.format(round(total_proceeds,2), round(total_cost,2), round(total_profit,2)))
print('\nAssets leftover:' + assetsToString(assets))

########################################
# Output trades in f8949 format

def buildF8949(fourteenTrades):
  f8949_data = {}
  f8949_data['FullNamePage1'] = personal_data['FirstNameAndInitial'] + ' ' + personal_data['LastName']
  f8949_data['SocialSecurityNumberPage1'] = personal_data['SocialSecurityNumber']

  f8949_data['isShortTermA'] = False
  f8949_data['isShortTermB'] = False
  f8949_data['isShortTermC'] = True # I don't have a Form 1099-B for my crypto trades

  totals = { 'Proceeds': 0, 'Cost': 0, 'GainOrLoss': 0 }

  for i, trade in enumerate(fourteenTrades):
    i+=1
    totals['Proceeds'] += trade['Proceeds']
    totals['Cost'] += trade['Cost']
    totals['GainOrLoss'] += trade['GainOrLoss']
    for key, value in trade.iteritems():
      field='ST' + str(i) + key
      print(field + ' = ' + str(value))
      f8949_data[field] = str(value)

  f8949_data['STTotalProceeds'] = totals['Proceeds']
  f8949_data['STTotalCost'] = totals['Cost']
  f8949_data['STTotalAdjustment'] = ''
  f8949_data['STTotalGainOrLoss'] = totals['GainOrLoss']

  return(f8949_data)

def chunks(l, n):
  """Yield successive n-sized chunks from l."""
  for i in range(0, len(l), n):
    yield l[i:i + n]

for i, tradesChunk in enumerate(chunks(trades, 14)):
  i+=1
  outfile=sys.argv[4]+'f8949_'+str(i)+'.json'
  print('writing to output file: ' + outfile)
  with open(outfile, "wb") as output:
    json.dump(buildF8949(tradesChunk), output)
