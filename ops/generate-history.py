 #!/usr/bin/env python
import sys
import csv
import json
import re
import os
import datetime

# Skip data from not this year
year='19'

input_folder = sys.argv[1]
addresses= json.load(open(sys.argv[2], "rb"))['addresses']
output_file=sys.argv[3]

input_files=os.listdir(input_folder)
field_names=['timestamp', 'asset', 'quantity', 'price', 'from', 'to', 'value_in', 'value_out', 'fee']
history=[]

hasWarned=[]

def toNum(str):
  if str == "":
    return 0
  else:
    return float(str)

for file in input_files:

  # Process tx history from Sendwyre
  if re.match('wyre', file):
    with open('%s/%s' % (input_folder,file), mode='rb') as f:
      csv_data = csv.DictReader(f)
      for row in csv_data:
        if row["Created At"] == '':
          continue
        timestamp = datetime.datetime.strptime(row["Created At"], '%b %d, %Y %I:%M:%S %p %Z').strftime('%y%m%d-%H%M%S')
        if timestamp[:2] != year:
          continue
        # Ignore transfers into wyre account
        if row["Source Currency"] == row["Dest Currency"]:
          continue
        generated_row = {
          "timestamp": timestamp,
          "asset": row["Source Currency"],
          "quantity": row["Source Amount"],
          "price": row["Exchange Rate"],
          "from": 'ex-sendwyre' if row["Type"] == "INCOMING" else 'self',
          "to": 'ex-sendwyre' if row["Type"] == "OUTGOING" else 'self',
          "value_in": row["Dest Amount"],
          "value_out": str(toNum(row["Source Amount"]) + toNum(row["Exchange Rate"])),
          "fee": str(toNum(row["Fees ETH"]) + toNum(row["Fees DAI"]) + toNum(row["Fees BTC"]) + toNum(row["Fees USD"]))
          # Note: fee is meaningless here bc units are fucked
        }
        history.append(generated_row)

  # Process tx history from Coinbase
  if re.match('coinbase', file):
    with open('%s/%s' % (input_folder,file), mode='rb') as f:
      f.readline()
      f.readline()
      f.readline()
      csv_data = csv.DictReader(f)
      for row in csv_data:
        timestamp = datetime.datetime.strptime(row["Timestamp"], '%m/%d/%Y').strftime('%y%m%d-%H%M%S')
        if timestamp[:2] != year:
          continue
        # Skip coinbase interactions that aren't a buy or sell
        if row["Transaction Type"] != "Buy" and row["Transaction Type"] != "Sell":
          continue
        value_usd = float(row["USD Amount Transacted (Inclusive of Coinbase Fees)"])
        value_asset = round(float(row["USD Spot Price at Transaction"]) * float(row["Quantity Transacted"]), 2)
        generated_row = {
          "timestamp": timestamp,
          "asset": row["Asset"],
          "quantity": row["Quantity Transacted"],
          "price": row["USD Spot Price at Transaction"],
          "from": 'ex-coinbase' if row["Transaction Type"] == "Buy" else 'self',
          "to": 'ex-coinbase' if row["Transaction Type"] == "Sell" else 'self',
          "value_in": value_asset if row["Transaction Type"] == "Buy" else value_usd,
          "value_out": value_asset if row["Transaction Type"] == "Sell" else value_usd,
          "fee": abs(value_asset - value_usd if row["Transaction Type"] == "Sell" else value_usd - value_asset),
        }
        history.append(generated_row)

  # Process tx history from Etherscan
  elif re.match('etherscan', file):
    with open('%s/%s' % (input_folder,file), mode='rb') as f:
      csv_data = csv.DictReader(f)
      for row in csv_data:
        timestamp = datetime.datetime.fromtimestamp(float(row["UnixTimestamp"])).strftime('%y%m%d-%H%M%S')
        if timestamp[:2] != year:
          continue
        if float(row["Value_OUT(ETH)"]) > 0 and float(row["Value_IN(ETH)"]) > 0:
          print("Edge case: found both value in and value out")
          print(row)
          exit(1)
        quantity = float(row["Value_IN(ETH)"]) + float(row["Value_OUT(ETH)"])
        if quantity == 0:
          continue
        # Try to match addresses to values in address book
        if row["From"] in addresses:
          sender = addresses[row["From"]]
        else:
          sender = row["From"]
          if sender not in hasWarned:
            print('Warning: address not in address book', sender, row["Txhash"])
            hasWarned.append(sender)
        if row["To"] in addresses:
          to = addresses[row["To"]]
        else:
          to = row["To"]
          if to not in hasWarned:
            print('Warning: address not in address book', to, row["Txhash"])
            hasWarned.append(to)
        # Skip self-to-self transactions
        if to[:4] == "self" and sender[:4] == "self":
          #print("Skipping self-to-self tx: %s -> %s" % (to, sender))
          continue
        # Skip coinbase transactions, will be included by coinbase-specific tx history
        if to == "ex-coinbase" or sender == "ex-coinbase":
          continue
        value = round(quantity * float(row["Historical $Price/Eth"]), 2)
        fee = '0' if not 'TxnFee(USD)' in row else row["TxnFee(USD)"]
        generated_row = {
          "timestamp": timestamp,
          "asset": 'ETH',
          "quantity": quantity,
          "price": row["Historical $Price/Eth"],
          "from": sender,
          "to": to,
          "value_in": value if float(row["Value_IN(ETH)"]) != 0 else 0,
          "value_out": value if float(row["Value_OUT(ETH)"]) != 0 else 0,
          "fee": fee
        }
        history.append(generated_row)

# Sort txs by timestamp
chronological = sorted(history, key=lambda k: k['timestamp'])

# Write tx history out to file
with open(output_file, "wb") as output:
  writer = csv.DictWriter(output, fieldnames=field_names)
  writer.writeheader()
  for row in chronological:
    writer.writerow(row)
