#!/bin/python
import csv
import json
import sys
from utils import *

########################################
# Read data from input files

personal=json.load(open(sys.argv[1]))
f2210=json.load(open(sys.argv[2]))
tx_history = csv.DictReader(open(sys.argv[3], 'rb'))
data_dir=sys.argv[4]

f1040=json.load(open(data_dir+'/f1040.json'))
f1040s4=json.load(open(data_dir+'/f1040s4.json'))
target=data_dir+'/f2210.json'

# TODO: What should these be?
annualization_amounts = [1,1,1,1]

########################################
# Build the form

f2210['FullName'] = '%s %s %s' % (personal['FirstName'], personal['MiddleInitial'], personal['LastName'])
f2210['SocialSecurityNumber'] = personal['SocialSecurityNumber']

line1 = fromForm(f1040['Line13'], f1040['Line13c'])
f2210['Line1'] = toForm(line1, 0)
f2210['Line1c'] = toForm(line1, 1)

# TODO: also include lines 59, 60a, 60b, and some of 62
line2 = fromForm(f1040s4['Line57'], f1040s4['Line57c'])
f2210['Line2'] = toForm(line2, 0)
f2210['Line2c'] = toForm(line2, 1)

line4 = line1 + line2
f2210['Line4'] = toForm(line4, 0)
f2210['Line4c'] = toForm(line4, 1)

line5 = line4 * 0.90
f2210['Line5'] = toForm(line5, 0)
f2210['Line5c'] = toForm(line5, 1)

line6 = fromForm(f1040['Line16'], f1040['Line16c'])
f2210['Line6'] = toForm(line6, 0)
f2210['Line6c'] = toForm(line6, 1)

line7 = line4 - line6
f2210['Line7'] = toForm(line7, 0)
f2210['Line7c'] = toForm(line7, 1)

line8 = fromForm(f2210['Line8'], f2210['Line8c'])
line9 = line8 if line8 < line5 else line5
f2210['Line9'] = toForm(line9, 0)
f2210['Line9c'] = toForm(line9, 1)

if line9 > line6:
  f2210['owePenaltyYes'] = True
else:
  f2210['owePenaltyNo'] = True

# Schedule AI - Annualized Income Installment Method
allIncome = personal['income']
income = { 'q1': 0, 'q2': 0, 'q3': 0, 'q4': 0 }

for payment in allIncome['payments']:
  month = float(payment['date'][2:4]) 
  if month <= 3:
    income['q1'] += float(payment['amount'])
  elif month > 3 and month <= 6:
    income['q2'] += float(payment['amount'])
  elif month > 6 and month <= 9:
    income['q3'] += float(payment['amount'])
  elif month > 9:
    income['q4'] += float(payment['amount'])
  print('Got payment of %s by %s' % (payment['amount'], payment['source']))

for row in tx_history:
  if row['from'][7:] in allIncome['exceptions']['skip']:
    continue
  elif row['from'][7:] in allIncome['exceptions']['half']:
    amount = str(round(float(row['value_in'])/2, 2))
  elif row['from'][:6] == "entity":
    amount = float(row['value_in'])
  else:
    continue
  month = float(row['timestamp'][2:4]) 
  if month <= 3:
    income['q1'] += float(amount)
  elif month > 3 and month <= 6:
    income['q2'] += float(amount)
  elif month > 6 and month <= 9:
    income['q3'] += float(amount)
  elif month > 9:
    income['q4'] += float(amount)
  print('Got payment of %s by %s' % (amount, row['from']))

print(income)

f2210['aiLine1a'] = toForm(income['q1'])
f2210['aiLine1b'] = toForm(income['q2'] + fromForm(f2210['aiLine1a']))
f2210['aiLine1c'] = toForm(income['q3'] + fromForm(f2210['aiLine1b']))
f2210['aiLine1d'] = toForm(income['q4'] + fromForm(f2210['aiLine1c']))

f2210['aiLine2a'] = toForm(annualization_amounts[0])
f2210['aiLine2b'] = toForm(annualization_amounts[1])
f2210['aiLine2c'] = toForm(annualization_amounts[2])
f2210['aiLine2d'] = toForm(annualization_amounts[3])

f2210['aiLine3a'] = toForm(fromForm(f2210['aiLine1a']) * fromForm(f2210['aiLine2a']))
f2210['aiLine3b'] = toForm(fromForm(f2210['aiLine1b']) * fromForm(f2210['aiLine2b']))
f2210['aiLine3c'] = toForm(fromForm(f2210['aiLine1c']) * fromForm(f2210['aiLine2c']))
f2210['aiLine3d'] = toForm(fromForm(f2210['aiLine1d']) * fromForm(f2210['aiLine2d']))

f2210['aiLine4a'] = personal['income']['expenses']['q1']
f2210['aiLine4b'] = toForm(fromForm(personal['income']['expenses']['q2']) + fromForm(f2210['aiLine4a']))
f2210['aiLine4c'] = toForm(fromForm(personal['income']['expenses']['q3']) + fromForm(f2210['aiLine4b']))
f2210['aiLine4d'] = toForm(fromForm(personal['income']['expenses']['q4']) + fromForm(f2210['aiLine4c']))

f2210['aiLine5a'] = toForm(annualization_amounts[0])
f2210['aiLine5b'] = toForm(annualization_amounts[1])
f2210['aiLine5c'] = toForm(annualization_amounts[2])
f2210['aiLine5d'] = toForm(annualization_amounts[3])

f2210['aiLine6a'] = toForm(fromForm(f2210['aiLine4a']) * fromForm(f2210['aiLine5a']))
f2210['aiLine6b'] = toForm(fromForm(f2210['aiLine4b']) * fromForm(f2210['aiLine5b']))
f2210['aiLine6c'] = toForm(fromForm(f2210['aiLine4c']) * fromForm(f2210['aiLine5c']))
f2210['aiLine6d'] = toForm(fromForm(f2210['aiLine4d']) * fromForm(f2210['aiLine5d']))

f2210['aiLine7a'] = toForm(12000)
f2210['aiLine7b'] = toForm(12000)
f2210['aiLine7c'] = toForm(12000)
f2210['aiLine7d'] = toForm(12000)

f2210['aiLine8a'] = f2210['aiLine6a'] if fromForm(f2210['aiLine6a']) > fromForm(f2210['aiLine7a']) else f2210['aiLine7a']
f2210['aiLine8b'] = f2210['aiLine6b'] if fromForm(f2210['aiLine6b']) > fromForm(f2210['aiLine7b']) else f2210['aiLine7b']
f2210['aiLine8c'] = f2210['aiLine6c'] if fromForm(f2210['aiLine6c']) > fromForm(f2210['aiLine7c']) else f2210['aiLine7c']
f2210['aiLine8d'] = f2210['aiLine6d'] if fromForm(f2210['aiLine6d']) > fromForm(f2210['aiLine7d']) else f2210['aiLine7d']

f2210['aiLine10a'] = toForm(fromForm(f2210['aiLine8a']) + fromForm(f2210['aiLine9a']))
f2210['aiLine10b'] = toForm(fromForm(f2210['aiLine8b']) + fromForm(f2210['aiLine9b']))
f2210['aiLine10c'] = toForm(fromForm(f2210['aiLine8c']) + fromForm(f2210['aiLine9c']))
f2210['aiLine10d'] = toForm(fromForm(f2210['aiLine8d']) + fromForm(f2210['aiLine9d']))

f2210['aiLine11a'] = toForm(fromForm(f2210['aiLine3a']) - fromForm(f2210['aiLine10a']))
f2210['aiLine11b'] = toForm(fromForm(f2210['aiLine3b']) - fromForm(f2210['aiLine10b']))
f2210['aiLine11c'] = toForm(fromForm(f2210['aiLine3c']) - fromForm(f2210['aiLine10c']))
f2210['aiLine11d'] = toForm(fromForm(f2210['aiLine3d']) - fromForm(f2210['aiLine10d']))

f2210['aiLine12a'] = toForm(0)
f2210['aiLine12b'] = toForm(0)
f2210['aiLine12c'] = toForm(0)
f2210['aiLine12d'] = toForm(0)

aiLine13a = fromForm(f2210['aiLine11a']) - fromForm(f2210['aiLine12a'])
aiLine13b = fromForm(f2210['aiLine11b']) - fromForm(f2210['aiLine12b'])
aiLine13c = fromForm(f2210['aiLine11c']) - fromForm(f2210['aiLine12c'])
aiLine13d = fromForm(f2210['aiLine11d']) - fromForm(f2210['aiLine12d'])
f2210['aiLine13a'] = toForm(aiLine13a if aiLine13a > 0 else 0)
f2210['aiLine13b'] = toForm(aiLine13b if aiLine13b > 0 else 0)
f2210['aiLine13c'] = toForm(aiLine13c if aiLine13c > 0 else 0)
f2210['aiLine13d'] = toForm(aiLine13d if aiLine13d > 0 else 0)

########################################
# Write form data to file

with open(target, "wb") as output:
  json.dump(f2210, output)
