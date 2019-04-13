#!/bin/python
import csv
import json
import sys
from utils import *

########################################
# Read data from input files

personal=json.load(open(sys.argv[1]))
f1040sse=json.load(open(sys.argv[2]))
target=sys.argv[3]+'/f1040s4.json'

########################################
# Build the form

f1040s4 = {}
f1040s4['FullName'] = '%s %s %s' % (personal['FirstName'], personal['MiddleInitial'], personal['LastName'])
f1040s4['SocialSecurityNumber'] = personal['SocialSecurityNumber']

line57 = fromForm(f1040sse['Line5'], f1040sse['Line5c'])
f1040s4['Line57'] = toForm(line57, 0)
f1040s4['Line57c'] = toForm(line57, 1)

f1040s4['Line64'] = toForm(line57, 0)
f1040s4['Line64c'] = toForm(line57, 1)

with open(target, "wb") as output:
  json.dump(f1040s4, output)
