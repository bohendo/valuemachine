 #!/usr/bin/env python
import sys
import csv
import json
import re
import os
import datetime

input_folder = sys.argv[1]
output_file=sys.argv[2]
address_book=sys.argv[3]

input_files=os.listdir(input_folder)
field_names=['timestamp', 'asset', 'quantity', 'from', 'to', 'value_in', 'value_out', 'fee']
history=[]

with open(address_book, "rb") as address_data:
  addresses = json.load(address_data)

for file in input_files:
  # Process tx history from Coinbase
  if re.match('coinbase', file):
    with open('%s/%s' % (input_folder,file), mode='rb') as f:
      f.readline()
      f.readline()
      f.readline()
      csv_data = csv.DictReader(f)
      n = 3
      for row in csv_data:
        timestamp = datetime.datetime.strptime(row["Timestamp"], '%m/%d/%Y').strftime('%y%m%d-%H%M%S')
        # Skip data from not 2018
        if timestamp[:2] != '18':
          continue
        value_usd = float(row["USD Amount Transacted (Inclusive of Coinbase Fees)"])
        value_asset = round(float(row["USD Spot Price at Transaction"]) * float(row["Quantity Transacted"]), 2)
        generated_row = {
          "timestamp": timestamp,
          "asset": row["Asset"],
          "quantity": row["Quantity Transacted"],
          "from": 'coinbase' if row["Transaction Type"] == "Buy" else 'me',
          "to": 'coinbase' if row["Transaction Type"] == "Sell" else 'me',
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
        if float(row["Value_OUT(ETH)"]) > 0 and float(row["Value_IN(ETH)"]) > 0:
          print("Edge case: found both value in and value out")
          print(row)
          exit(1)
        quantity = float(row["Value_IN(ETH)"]) + float(row["Value_OUT(ETH)"])
        if quantity == 0:
          continue
        if row["From"] in addresses:
          sender = addresses[row["From"]]
        else:
          sender = row["From"]
          print('Warning: address not in address book', sender)
        if row["To"] in addresses:
          to = addresses[row["To"]]
        else:
          to = row["To"]
          print('Warning: address not in address book', to)
        timestamp = datetime.datetime.fromtimestamp(float(row["UnixTimestamp"])).strftime('%y%m%d-%H%M%S')
        value = round(quantity * float(row["Historical $Price/Eth"]), 2)
        generated_row = {
          "timestamp": timestamp,
          "asset": 'ETH',
          "quantity": quantity,
          "from": sender,
          "to": to,
          "value_in": value if float(row["Value_IN(ETH)"]) != 0 else 0,
          "value_out": value if float(row["Value_OUT(ETH)"]) != 0 else 0,
          "fee": row["TxnFee(USD)"]
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
