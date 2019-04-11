#!/bin/python
import csv
import json
import sys

f1040=json.load(open(sys.argv[1]))
f1040sc=json.load(open(sys.argv[2]))
txHistory = csv.DictReader(open(sys.argv[3], 'rb'))
target=sys.argv[4]+'/f1040sc.json'

f1040sc['FullName'] = f1040['FirstNameAndInitial'] + ' ' + f1040['LastName']
f1040sc['SocialSecurityNumber'] = f1040['SocialSecurityNumber']

# Calculate income that came from txHistory
for row in txHistory:

  if row['timestamp'][:2] != '18':
    print("invalid row")
    continue

  if row['from'][:6] == "entity":
    print(row)

with open(target, "wb") as output:
  json.dump(f1040sc, output)

