#!/bin/python
import csv
from datetime import date
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
applicable_percentage = 1

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

# Begin: Schedule AI - Annualized Income Installment Method

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

print('Income: ', income)

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

f2210['aiLine14a'] = toForm(0)
f2210['aiLine14b'] = toForm(0)
f2210['aiLine14c'] = toForm(0)
f2210['aiLine14d'] = toForm(0)

aiLine28a = fromForm(f2210['aiLine1a']) - fromForm(f2210['aiLine6a'])
aiLine28b = fromForm(f2210['aiLine1b']) - fromForm(f2210['aiLine6b'])
aiLine28c = fromForm(f2210['aiLine1c']) - fromForm(f2210['aiLine6c'])
aiLine28d = fromForm(f2210['aiLine1d']) - fromForm(f2210['aiLine6d'])
f2210['aiLine28a'] = toForm(aiLine28a)
f2210['aiLine28b'] = toForm(aiLine28b)
f2210['aiLine28c'] = toForm(aiLine28c)
f2210['aiLine28d'] = toForm(aiLine28d)

f2210['aiLine31a'] = toForm(0)
f2210['aiLine31b'] = toForm(0)
f2210['aiLine31c'] = toForm(0)
f2210['aiLine31d'] = toForm(0)

f2210['aiLine32a'] = toForm(annualization_amounts[0])
f2210['aiLine32b'] = toForm(annualization_amounts[1])
f2210['aiLine32c'] = toForm(annualization_amounts[2])
f2210['aiLine32d'] = toForm(annualization_amounts[3])

aiLine33a = aiLine28a if aiLine28a < fromForm(f2210['aiLine31a']) else fromForm(f2210['aiLine31a'])
aiLine33b = aiLine28b if aiLine28b < fromForm(f2210['aiLine31b']) else fromForm(f2210['aiLine31b'])
aiLine33c = aiLine28c if aiLine28c < fromForm(f2210['aiLine31c']) else fromForm(f2210['aiLine31c'])
aiLine33d = aiLine28d if aiLine28d < fromForm(f2210['aiLine31d']) else fromForm(f2210['aiLine31d'])
f2210['aiLine33a'] = toForm(aiLine33a * fromForm(f2210['aiLine32a']))
f2210['aiLine33b'] = toForm(aiLine33b * fromForm(f2210['aiLine32b']))
f2210['aiLine33c'] = toForm(aiLine33c * fromForm(f2210['aiLine32c']))
f2210['aiLine33d'] = toForm(aiLine33d * fromForm(f2210['aiLine32d']))

f2210['aiLine34a'] = toForm(annualization_amounts[0])
f2210['aiLine34b'] = toForm(annualization_amounts[1])
f2210['aiLine34c'] = toForm(annualization_amounts[2])
f2210['aiLine34d'] = toForm(annualization_amounts[3])

f2210['aiLine35a'] = toForm(fromForm(f2210['aiLine28a']) * fromForm(f2210['aiLine34a']))
f2210['aiLine35b'] = toForm(fromForm(f2210['aiLine28b']) * fromForm(f2210['aiLine34b']))
f2210['aiLine35c'] = toForm(fromForm(f2210['aiLine28c']) * fromForm(f2210['aiLine34c']))
f2210['aiLine35d'] = toForm(fromForm(f2210['aiLine28d']) * fromForm(f2210['aiLine34d']))

f2210['aiLine36a'] = toForm(fromForm(f2210['aiLine33a']) + fromForm(f2210['aiLine35a']))
f2210['aiLine36b'] = toForm(fromForm(f2210['aiLine33b']) + fromForm(f2210['aiLine35b']))
f2210['aiLine36c'] = toForm(fromForm(f2210['aiLine33c']) + fromForm(f2210['aiLine35c']))
f2210['aiLine36d'] = toForm(fromForm(f2210['aiLine33d']) + fromForm(f2210['aiLine35d']))

f2210['aiLine15a'] = f2210['aiLine36a']
f2210['aiLine15b'] = f2210['aiLine36b']
f2210['aiLine15c'] = f2210['aiLine36c']
f2210['aiLine15d'] = f2210['aiLine36d']

f2210['aiLine17a'] = toForm(fromForm(f2210['aiLine14a']) + fromForm(f2210['aiLine15a']) + fromForm(f2210['aiLine16a']))
f2210['aiLine17b'] = toForm(fromForm(f2210['aiLine14b']) + fromForm(f2210['aiLine15b']) + fromForm(f2210['aiLine16b']))
f2210['aiLine17c'] = toForm(fromForm(f2210['aiLine14c']) + fromForm(f2210['aiLine15c']) + fromForm(f2210['aiLine16c']))
f2210['aiLine17d'] = toForm(fromForm(f2210['aiLine14d']) + fromForm(f2210['aiLine15d']) + fromForm(f2210['aiLine16d']))

f2210['aiLine19a'] = f2210['aiLine17a']
f2210['aiLine19b'] = f2210['aiLine17b']
f2210['aiLine19c'] = f2210['aiLine17c']
f2210['aiLine19d'] = f2210['aiLine17d']

f2210['aiLine20a'] = toForm(applicable_percentage)
f2210['aiLine20b'] = toForm(applicable_percentage)
f2210['aiLine20c'] = toForm(applicable_percentage)
f2210['aiLine20d'] = toForm(applicable_percentage)

f2210['aiLine21a'] = toForm(fromForm(f2210['aiLine19a']) * fromForm(f2210['aiLine20a']))
f2210['aiLine21b'] = toForm(fromForm(f2210['aiLine19b']) * fromForm(f2210['aiLine20b']))
f2210['aiLine21c'] = toForm(fromForm(f2210['aiLine19c']) * fromForm(f2210['aiLine20c']))
f2210['aiLine21d'] = toForm(fromForm(f2210['aiLine19d']) * fromForm(f2210['aiLine20d']))

f2210['aiLine24a'] = toForm(fromForm(f2210['Line9']) * 0.25)
f2210['aiLine24b'] = toForm(fromForm(f2210['Line9']) * 0.25)
f2210['aiLine24c'] = toForm(fromForm(f2210['Line9']) * 0.25)
f2210['aiLine24d'] = toForm(fromForm(f2210['Line9']) * 0.25)

# Column 1

f2210['aiLine23a'] = toForm(f2210['aiLine21a'] if fromForm(f2210['aiLine21a']) > 0 else 0)

f2210['aiLine26a'] = f2210['aiLine24a']
f2210['aiLine27a'] = f2210['aiLine23a'] if fromForm(f2210['aiLine23a']) < fromForm(f2210['aiLine26a']) else f2210['aiLine26a']

# Column 2

f2210['aiLine22b'] = f2210['aiLine27a']

aiLine23b = fromForm(f2210['aiLine21b']) - fromForm(f2210['aiLine22b'])
f2210['aiLine23b'] = toForm(aiLine23b if aiLine23b > 0 else 0)

f2210['aiLine25b'] = toForm(fromForm(f2210['aiLine26a']) - fromForm(f2210['aiLine27a']))
f2210['aiLine26b'] = toForm(fromForm(f2210['aiLine24b']) + fromForm(f2210['aiLine25b']))
f2210['aiLine27b'] = f2210['aiLine23b'] if fromForm(f2210['aiLine23b']) < fromForm(f2210['aiLine26b']) else f2210['aiLine26b']

# Column 3

f2210['aiLine22c'] = toForm(fromForm(f2210['aiLine27a']) + fromForm(f2210['aiLine27b']))

aiLine23c = fromForm(f2210['aiLine21c']) - fromForm(f2210['aiLine22c'])
f2210['aiLine23c'] = toForm(aiLine23c if aiLine23c > 0 else 0)

f2210['aiLine25c'] = toForm(fromForm(f2210['aiLine26b']) - fromForm(f2210['aiLine27b']))
f2210['aiLine26c'] = toForm(fromForm(f2210['aiLine24c']) + fromForm(f2210['aiLine25c']))
f2210['aiLine27c'] = f2210['aiLine23c'] if fromForm(f2210['aiLine23c']) < fromForm(f2210['aiLine26c']) else f2210['aiLine26c']

# Column 4

f2210['aiLine22d'] = toForm(fromForm(f2210['aiLine27a']) + fromForm(f2210['aiLine27b']) + fromForm(f2210['aiLine27c']))

aiLine23d = fromForm(f2210['aiLine21d']) - fromForm(f2210['aiLine22d'])
f2210['aiLine23d'] = toForm(aiLine23d if aiLine23d > 0 else 0)

f2210['aiLine25d'] = toForm(fromForm(f2210['aiLine26c']) - fromForm(f2210['aiLine27c']))
f2210['aiLine26d'] = toForm(fromForm(f2210['aiLine24d']) + fromForm(f2210['aiLine25d']))
f2210['aiLine27d'] = f2210['aiLine23d'] if fromForm(f2210['aiLine23d']) < fromForm(f2210['aiLine26d']) else f2210['aiLine26d']

# The End: Schedule AI
# Begin: Part IV - Regular Method

f2210['Line18a'] = f2210['aiLine27a']
f2210['Line18b'] = f2210['aiLine27b']
f2210['Line18c'] = f2210['aiLine27c']
f2210['Line18d'] = f2210['aiLine27d']

f2210['Line19a'] = toForm(0)
f2210['Line19b'] = toForm(0)
f2210['Line19c'] = toForm(0)
f2210['Line19d'] = toForm(0)

# Column a

f2210['Line23a'] = f2210['Line19a']

if fromForm(f2210['Line18a']) >= fromForm(f2210['Line23a']):
  f2210['Line25a'] = toForm(fromForm(f2210['Line18a']) - fromForm(f2210['Line23a']))
else:
  f2210['Line26a'] = toForm(fromForm(f2210['Line23a']) - fromForm(f2210['Line18a']))

# Column b

f2210['Line20b'] = f2210['Line26a']
f2210['Line21b'] = toForm(fromForm(f2210['Line19b']) + fromForm(f2210['Line20b']))
f2210['Line22b'] = toForm(fromForm(f2210['Line24a']) + fromForm(f2210['Line25a']))

line23b = fromForm(f2210['Line21b']) - fromForm(f2210['Line22b'])
f2210['Line23b'] = toForm(line23b if line23b > 0 else 0)

line24b = fromForm(f2210['Line22b']) - fromForm(f2210['Line21b'])
f2210['Line24b'] = toForm(line24b if fromForm(f2210['Line23b']) == 0 else 0)

if fromForm(f2210['Line18b']) >= fromForm(f2210['Line23b']):
  f2210['Line25b'] = toForm(fromForm(f2210['Line18b']) - fromForm(f2210['Line23b']))
else:
  f2210['Line26b'] = toForm(fromForm(f2210['Line23b']) - fromForm(f2210['Line18b']))

# Column c

f2210['Line20c'] = f2210['Line26b']
f2210['Line21c'] = toForm(fromForm(f2210['Line19c']) + fromForm(f2210['Line20c']))
f2210['Line22c'] = toForm(fromForm(f2210['Line24b']) + fromForm(f2210['Line25b']))

line23c = fromForm(f2210['Line21c']) - fromForm(f2210['Line22c'])
f2210['Line23c'] = toForm(line23c if line23c > 0 else 0)

line24c = fromForm(f2210['Line22c']) - fromForm(f2210['Line21c'])
f2210['Line24c'] = toForm(line24c if fromForm(f2210['Line23c']) == 0 else 0)

if fromForm(f2210['Line18c']) >= fromForm(f2210['Line23c']):
  f2210['Line25c'] = toForm(fromForm(f2210['Line18c']) - fromForm(f2210['Line23c']))
else:
  f2210['Line26c'] = toForm(fromForm(f2210['Line23c']) - fromForm(f2210['Line18c']))

# Column d

f2210['Line20d'] = f2210['Line26c']
f2210['Line21d'] = toForm(fromForm(f2210['Line19d']) + fromForm(f2210['Line20d']))
f2210['Line22d'] = toForm(fromForm(f2210['Line24c']) + fromForm(f2210['Line25c']))

line23d = fromForm(f2210['Line21d']) - fromForm(f2210['Line22d'])
f2210['Line23d'] = toForm(line23d if line23d > 0 else 0)

if fromForm(f2210['Line18d']) >= fromForm(f2210['Line23d']):
  f2210['Line25d'] = toForm(fromForm(f2210['Line18d']) - fromForm(f2210['Line23d']))

# Penalty Calculation

penalties = { 'rp1': 0, 'rp2': 0, 'rp3': 0, 'rp4': 0 }

wk1a = fromForm(f2210['Line25a'])
wk1b = fromForm(f2210['Line25b'])
wk1c = fromForm(f2210['Line25c'])
wk1d = fromForm(f2210['Line25d'])

print('Payments owed: %d %d %d %d' % (wk1a, wk1b, wk1c, wk1d))

# Rate Period 1

Apr15 = date(2018, 4, 15)
Jun15 = date(2018, 6, 15)
Jun30 = date(2018, 6, 30)

wk3a = (Jun30 - Apr15).days
wk3b = (Jun30 - Jun15).days

wk4a = round((wk1a * wk3a * 0.05) / 365, 2)
wk4b = round((wk1b * wk3b * 0.05) / 365, 2)

penalties['rp1'] = wk4a + wk4b

# Rate Period 2

Jun30 = date(2018, 6, 30)
Sep15 = date(2018, 9, 15)
Sep30 = date(2018, 9, 30)

wk6a = (Sep30 - Jun30).days
wk6b = (Sep30 - Jun30).days
wk6c = (Sep30 - Sep15).days

wk7a = round((wk1a * wk6a * 0.05) / 365, 2)
wk7b = round((wk1b * wk6b * 0.05) / 365, 2)
wk7c = round((wk1c * wk6c * 0.05) / 365, 2)

penalties['rp2'] = wk7a + wk7b + wk7c

# Rate Period 3

Sep15 = date(2018, 9, 15)
Sep30 = date(2018, 9, 30)
Dec31 = date(2018, 12, 31)

wk9a = (Dec31 - Sep30).days
wk9b = (Dec31 - Sep30).days
wk9c = (Dec31 - Sep30).days

wk10a = round((wk1a * wk9a * 0.05) / 365, 2)
wk10b = round((wk1b * wk9b * 0.05) / 365, 2)
wk10c = round((wk1c * wk9c * 0.05) / 365, 2)

penalties['rp3'] = wk10a + wk10b + wk10c

# Rate Period 4

Dec31 = date(2018, 12, 31)
Jan15 = date(2019, 1, 15)
Apr15 = date(2019, 4, 15)

wk12a = (Apr15 - Dec31).days
wk12b = (Apr15 - Dec31).days
wk12c = (Apr15 - Dec31).days
wk12d = (Apr15 - Jan15).days

wk13a = round((wk1a * wk12a * 0.06) / 365, 2)
wk13b = round((wk1b * wk12b * 0.06) / 365, 2)
wk13c = round((wk1c * wk12c * 0.06) / 365, 2)
wk13d = round((wk1d * wk12d * 0.06) / 365, 2)

penalties['rp4'] = wk13a + wk13b + wk13c + wk13d

print('Rate period 1 penalties: %s + %s = %s' % (wk4a, wk4b, penalties['rp1']))
print('Rate period 2 penalties: %s + %s + %s = %s' % (wk7a, wk7b, wk7c, penalties['rp2']))
print('Rate period 3 penalties: %s + %s + %s = %s' % (wk10a, wk10b, wk10c, penalties['rp3']))
print('Rate period 4 penalties: %s + %s + %s + %s = %s' % (wk13a, wk13b, wk13c, wk13d, penalties['rp4']))
total = penalties['rp1'] + penalties['rp2'] + penalties['rp3'] + penalties['rp4']
print('Total Penalty: %s' % (total))

f2210['Line27'] = toForm(total)

# Include penalty on f1040 too
f1040['Line23'] = toForm(total, 0)
f1040['Line23c'] = toForm(total, 1)

########################################
# Write form data to file

with open(data_dir+'/f2210.json', "wb") as output:
  json.dump(f2210, output)

with open(data_dir+'/f1040.json', "wb") as output:
  json.dump(f1040, output)
