#!/bin/python
import csv
import json
import sys

########################################
# Read data from input files

f1040sse=json.load(open(sys.argv[1]))
f1040=json.load(open(sys.argv[2]))
f1040sc=json.load(open(sys.argv[3]))
target=sys.argv[4]+'/f1040sse.json'

########################################
# Helper Functions

def fromForm(dollars, cents):
  number = ''
  number += '0' if str(dollars) == "" else str(dollars)
  number += '.'
  number += '0' if str(cents) == "" else str(cents)
  return float(number)

def toForm(num, isCents):
  out = str(round(num, 2)).split('.')[isCents]
  return '' if out == '0' else out

########################################
# Build the form

f1040sse['FullNamePage1'] = f1040['FirstNameAndInitial'] + ' ' + f1040['LastName']
f1040sse['SocialSecurityNumberPage1'] = f1040['SocialSecurityNumber']

profitOrLoss = fromForm(f1040sc['Line31'], f1040sc['Line31c'])

f1040sse['Line2'] = toForm(profitOrLoss, 0)
f1040sse['Line2c'] = toForm(profitOrLoss, 1)

f1040sse['Line3'] = toForm(profitOrLoss, 0)
f1040sse['Line3c'] = toForm(profitOrLoss, 1)

line4 = profitOrLoss * 0.9235
f1040sse['Line4'] = toForm(line4, 0)
f1040sse['Line4c'] = toForm(line4, 1)

if line4 >= 128400:
  line5 = (line4 * 0.029) + 5921.60
else:
  line5 = line4 * 0.153

f1040sse['Line5'] = toForm(line5, 0)
f1040sse['Line5c'] = toForm(line5, 1)

line6 = line5 * 0.5
f1040sse['Line6'] = toForm(line6, 0)
f1040sse['Line6c'] = toForm(line6, 1)

with open(target, "wb") as output:
  json.dump(f1040sse, output)
