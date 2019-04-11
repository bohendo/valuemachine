#!/bin/python
import csv
import json
import sys
from utils import *

########################################
# Read data from input files

f2210=json.load(open(sys.argv[1]))
f1040=json.load(open(sys.argv[2]))
target=sys.argv[3]+'/f2210.json'

########################################
# Build the form

f2210['FullName'] = f1040['FirstNameAndInitial'] + ' ' + f1040['LastName']
f2210['SocialSecurityNumber'] = f1040['SocialSecurityNumber']

########################################
# Write form data to file

with open(target, "wb") as output:
  json.dump(f2210, output)
