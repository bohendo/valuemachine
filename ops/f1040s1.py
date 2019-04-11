#!/bin/python
import csv
import json
import sys

########################################
# Read data from input files

f1040s1=json.load(open(sys.argv[1]))
f1040=json.load(open(sys.argv[2]))
f1040sc=json.load(open(sys.argv[3]))
f1040sse=json.load(open(sys.argv[4]))
f1040sd=json.load(open(sys.argv[5]))
target=sys.argv[6]+'/f1040s1.json'

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
  return '' if out == '0' else out

########################################
# Build the form

f1040s1['FullName'] = f1040['FirstNameAndInitial'] + ' ' + f1040['LastName']
f1040s1['SocialSecurityNumber'] = f1040['SocialSecurityNumber']

line12 = fromForm(f1040sc['Line31'], f1040sc['Line31c'])
f1040s1['Line12'] = toForm(line12, 0)
f1040s1['Line12c'] = toForm(line12, 1)

if float(f1040sd['Line16']) >= 0:
  line13 = float(f1040sd['Line16'])
else:
  line13 = float(f1040sd['Line21']) * -1

f1040s1['Line13'] = toForm(line13, 0)
f1040s1['Line13c'] = toForm(line13, 1)

line22 = 0
for line in [10,11,12,13,14,17,18,19,21]:
  value = fromForm(f1040s1['Line' + str(line)], f1040s1['Line'+str(line)+'c'])
  line22 += value
f1040s1['Line22'] = toForm(line22, 0)
f1040s1['Line22c'] = toForm(line22, 1)

line27 = fromForm(f1040sse['Line6'], f1040sse['Line6'])
f1040s1['Line27'] = toForm(line27, 0)
f1040s1['Line27c'] = toForm(line27, 1)

line36 = 0
for line in [23,24,25,26,27,28,29,30,'31a',32,33]:
  value = fromForm(f1040s1['Line' + str(line)], f1040s1['Line'+str(line)+'c'])
  line36 += value
f1040s1['Line36'] = toForm(line36, 0)
f1040s1['Line36c'] = toForm(line36, 1)

########################################
# Write form data to file

with open(target, "wb") as output:
  json.dump(f1040s1, output)
