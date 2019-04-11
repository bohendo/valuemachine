#!/bin/python
import csv
import json
import sys
from utils import *

########################################
# Read data from input files

income=json.load(open(sys.argv[1]))
f1040=json.load(open(sys.argv[2]))
f1040sc=json.load(open(sys.argv[3]))
txHistory = csv.DictReader(open(sys.argv[4], 'rb'))
target=sys.argv[5]+'/f1040sc.json'

########################################
# Build the form

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

f1040sc['Line1'] = toForm(total_income, 0)
f1040sc['Line1c'] = toForm(total_income, 1)
print('Total income: %s' % (total_income))

returns = fromForm(f1040sc['Line2'], f1040sc['Line2c'])

line3 = total_income - returns
f1040sc['Line3'] = toForm(line3, 0)
f1040sc['Line3c'] = toForm(line3, 1)

line4 = fromForm(f1040sc['Line42'], f1040sc['Line42c'])
f1040sc['Line4'] = toForm(line4, 0)
f1040sc['Line4c'] = toForm(line4, 1)

line5 = line3 - line4
f1040sc['Line5'] = toForm(line5, 0)
f1040sc['Line5c'] = toForm(line5, 1)

line6 = fromForm(f1040sc['Line6'], f1040sc['Line6c'])
line7 = line6 + line5
f1040sc['Line7'] = toForm(line7, 0)
f1040sc['Line7c'] = toForm(line7, 1)

total_expenses = 0
for expense in income['expenses']:
  if expense in f1040sc:
    amount = float(income['expenses'][expense])
    print('found expense for %s: %d' % (expense, amount))
    f1040sc[expense] = toForm(amount, 0)
    f1040sc[expense + 'c'] = toForm(amount, 1)
    total_expenses += amount

f1040sc['Line28'] = toForm(total_expenses, 0)
f1040sc['Line28c'] = toForm(total_expenses, 1)

line29 = line7 - total_expenses
f1040sc['Line29'] = toForm(line29, 0)
f1040sc['Line29c'] = toForm(line29, 1)

line30 = fromForm(f1040sc['Line30'], f1040sc['Line30c'])

line31 = line29 - line30
f1040sc['Line31'] = toForm(line31, 0)
f1040sc['Line31c'] = toForm(line31, 1)

with open(target, "wb") as output:
  json.dump(f1040sc, output)

