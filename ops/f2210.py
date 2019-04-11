#!/bin/python
import csv
import json
import sys

########################################
# Read data from input files

f2210=json.load(open(sys.argv[1]))
f1040=json.load(open(sys.argv[2]))
target=sys.argv[3]+'/f2210.json'

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

f2210['FullName'] = f1040['FirstNameAndInitial'] + ' ' + f1040['LastName']
f2210['SocialSecurityNumber'] = f1040['SocialSecurityNumber']

########################################
# Write form data to file

with open(target, "wb") as output:
  json.dump(f2210, output)
