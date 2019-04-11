#!/bin/python
import csv
import json
import sys

income=json.load(open(sys.argv[1]))
f1040=json.load(open(sys.argv[2]))
f1040sc=json.load(open(sys.argv[3]))
txHistory = csv.DictReader(open(sys.argv[4], 'rb'))
target=sys.argv[5]+'/f1040sc.json'

f1040sc['FullName'] = f1040['FirstNameAndInitial'] + ' ' + f1040['LastName']
f1040sc['SocialSecurityNumber'] = f1040['SocialSecurityNumber']

# Starting income, from non-tx-history sources
total_income = 0
for payment in income['payments']:
  print('Got full payment of %s by %s' % (payment['amount'], payment['source']))
  total_income += float(payment['amount'])

# Calculate income that came from txHistory
for row in txHistory:
  if row['timestamp'][:2] != '18':
    print("invalid row")
    continue
  if row['from'][7:] in income['exceptions']['skip']:
    print('Skipping payment of %s by %s' % (row['value_in'], row['from']))
    continue
  elif row['from'][7:] in income['exceptions']['half']:
    amount = str(round(float(row['value_in'])/2, 2))
    print('Got half payment of %s by %s' % (amount, row['from']))
    total_income += float(amount)
  elif row['from'][:6] == "entity":
    print('Got full payment of %s by %s' % (row['value_in'], row['from']))
    total_income += float(row['value_in'])

f1040sc['Line1'] = str(round(total_income,2)).split('.')[0]
f1040sc['Line1c'] = str(round(total_income,2)).split('.')[1]
print('Total income: %s' % (total_income))

with open(target, "wb") as output:
  json.dump(f1040sc, output)

