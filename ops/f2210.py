#!/bin/python
import csv
import json
import sys
from utils import *

########################################
# Read data from input files

personal=json.load(open(sys.argv[1]))
f2210=json.load(open(sys.argv[2]))
f1040=json.load(open(sys.argv[3]))
target=sys.argv[4]+'/f2210.json'

########################################
# Build the form

f2210['FullName'] = '%s %s %s' % (personal['FirstName'], personal['MiddleInitial'], personal['LastName'])
f2210['SocialSecurityNumber'] = personal['SocialSecurityNumber']

########################################
# Write form data to file

with open(target, "wb") as output:
  json.dump(f2210, output)
