import csv
import json
from os.path import isfile

def getName(personal):
  if 'SpouseFirstName' in personal:
    return '%s %s %s & %s %s %s' % (
      personal['FirstName'], personal['MiddleInitial'], personal['LastName'],
      personal['SpouseFirstName'], personal['SpouseMiddleInitial'], personal['SpouseLastName']
    )
  else:
    return '%s %s %s' % (
      personal['FirstName'], personal['MiddleInitial'], personal['LastName']
    )

def loadJSON(filename):
  if isfile(filename):
    return json.load(open(filename, 'rb'))
  else:
    return {}

def loadCSV(filename):
  if isfile(filename):
    return csv.DictReader(open(filename, 'rb'))
  else:
    return {}

def fromForm(dollars, cents=None):
  if dollars[:1] == '(':
    dollars = '-' + dollars[1:]
  if cents is None:
    if dollars[-1:] == ')':
      dollars = dollars[:-1]
    return 0 if dollars == '' else float(dollars)
  if cents[-1:] == ')':
    cents = cents[:-1]
  number = ''
  number += '0' if str(dollars) == "" else str(dollars)
  number += '.'
  number += '0' if str(cents) == "" else str(cents)
  return float(number)

def toForm(num, isCents=None):
  strnum = '%.2f' % round(abs(num), 2)
  if isCents is None:
    out = '('+strnum+')' if num < 0 else strnum
  else:
    out = strnum.split('.')[isCents]
    out = '(' + out if num < 0 and isCents == 0 else out
    out = out + ')' if num < 0 and isCents == 1 else out
  return out

