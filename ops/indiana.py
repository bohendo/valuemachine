#!/bin/python
import csv
import json
import sys
from os.path import isfile
from utils import *

########################################
# Read data from input files

src_dir=sys.argv[1]
data_dir=sys.argv[2]

personal=json.load(open(src_dir+'/personal.json'))

if isfile(src_dir+'/it40pnr.json'):
  it40pnr=json.load(open(src_dir+'/it40pnr.json'))
else:
  it40pnr={}

it40pnr['FirstName'] = personal['FirstName']
it40pnr['MiddleInitial'] = personal['MiddleInitial']
it40pnr['LastName'] = personal['LastName']
it40pnr['SSN1'] = personal['SocialSecurityNumber'][:3]
it40pnr['SSN2'] = personal['SocialSecurityNumber'][3:5]
it40pnr['SSN3'] = personal['SocialSecurityNumber'][5:]


########################################
# Write form data to file

with open(data_dir+'/it40pnr.json', "wb") as output:
  json.dump(it40pnr, output)

