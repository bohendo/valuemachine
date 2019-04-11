#!/bin/python
import csv
import json
import sys

########################################
# Read data from input files

f1040=json.load(open(sys.argv[1]))
f1040s1=json.load(open(sys.argv[2]))
f1040s4=json.load(open(sys.argv[3]))
target=sys.argv[4]+'/f1040.json'

########################################
# Helper Functions

def fromForm(dollars, cents):
  if dollars[:1] == '(':
    dollars = '-' + dollars[1:]
  if cents[-1:] == ')':
    cents = cents[:-1]
  number = ''
  number += '0' if str(dollars) == "" else str(dollars)
  number += '.'
  number += '0' if str(cents) == "" else str(cents)
  return float(number)

def toForm(num, isCents):
  strnum = '%.2f' % round(abs(num), 2)
  out = strnum.split('.')[isCents]
  out = '(' + out if num < 0 and isCents == 0 else out
  out = out + ')' if num < 0 and isCents == 1 else out
  return out

########################################
# Build the form

line6extra = fromForm(f1040s1['Line22'], f1040s1['Line22c'])
f1040['Line6Extra'] = toForm(line6extra, 0) + '.' + toForm(line6extra, 1)
line6 = line6extra
for line in [1,'2a','2b','3a','3b','4a','4b','5a','5b']:
  value = fromForm(f1040['Line' + str(line)], f1040['Line'+str(line)+'c'])
  line6 += value
f1040['Line6'] = toForm(line6, 0)
f1040['Line6c'] = toForm(line6, 1)

line7 = line6 - fromForm(f1040s1['Line36'], f1040s1['Line36c'])
f1040['Line7'] = toForm(line7, 0)
f1040['Line7c'] = toForm(line7, 1)

if f1040['FilingSingle'] or f1040['FilingMarriedSeparate']:
  line8 = 12000
elif f1040['FilingMarriedJointly'] or f1040['FilingWidow']:
  line8 = 24000
elif f1040['FilingHeadOfHousehold']:
  line8 = 18000
f1040['Line8'] = toForm(line8, 0)
f1040['Line8c'] = toForm(line8, 1)

line10 = line7 - line8 - fromForm(f1040['Line9'], f1040['Line9c'])
line10 = line10 if line10 >= 0 else 0
f1040['Line10'] = toForm(line10, 0)
f1040['Line10c'] = toForm(line10, 1)

# TODO: tax table?!
if line10 == 0:
  line11 = 0
else:
  print('Oh no, idk how to use the tax table in python..')
  exit(1)
f1040['Line11a'] = toForm(line11, 0) + '.' + toForm(line11, 1)
f1040['Line11'] = toForm(line11, 0)
f1040['Line11c'] = toForm(line11, 1)

line13 = line11 - fromForm(f1040['Line12'], f1040['Line12c'])
line13 = line13 if line13 >= 0 else 0
f1040['Line13'] = toForm(line13, 0)
f1040['Line13c'] = toForm(line13, 1)

line14 = fromForm(f1040s4['Line64'], f1040s4['Line64c'])
f1040['Line14'] = toForm(line14, 0)
f1040['Line14c'] = toForm(line14, 1)

line15 = line13 + line14
f1040['Line15'] = toForm(line15, 0)
f1040['Line15c'] = toForm(line15, 1)

line16 = fromForm(f1040['Line16'], f1040['Line16c'])
line17 = fromForm(f1040['Line17'], f1040['Line17c'])
line18 = line16 + line17
f1040['Line18'] = toForm(line18, 0)
f1040['Line18c'] = toForm(line18, 1)

line19 = line18 - line15
line19 = line19 if line19 >= 0 else 0
f1040['Line19'] = toForm(line19, 0)
f1040['Line19c'] = toForm(line19, 1)

line22 = line15 - line18
line22 = line22 if line22 >= 0 else 0
f1040['Line22'] = toForm(line22, 0)
f1040['Line22c'] = toForm(line22, 1)

########################################
# Write form data to file

with open(target, "wb") as output:
  json.dump(f1040, output)
