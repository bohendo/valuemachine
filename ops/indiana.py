#!/bin/python
import sys
from utils import *

########################################
# Read data from input files

src_dir=sys.argv[1]
data_dir=sys.argv[2]

personal=loadJSON(src_dir+'/personal.json')
it40pnr=loadJSON(src_dir+'/it40pnr.json')
it40pnrsa=loadJSON(src_dir+'/it40pnr-sa.json')
it40pnrsd=loadJSON(src_dir+'/it40pnr-sd.json')
it40pnrsh=loadJSON(src_dir+'/it40pnr-sh.json')
ct40pnr=loadJSON(src_dir+'/ct40pnr.json')

########################################
# Build forms

it40pnr['FirstName'] = personal['FirstName']
it40pnr['MiddleInitial'] = personal['MiddleInitial']
it40pnr['LastName'] = personal['LastName']
it40pnr['SSN1'] = personal['SocialSecurityNumber'][:3]
it40pnr['SSN2'] = personal['SocialSecurityNumber'][3:5]
it40pnr['SSN3'] = personal['SocialSecurityNumber'][5:]

it40pnrsa['FullName'] = '%s %s %s' % (personal['FirstName'], personal['MiddleInitial'], personal['LastName'])
it40pnrsa['SSN1'] = personal['SocialSecurityNumber'][:3]
it40pnrsa['SSN2'] = personal['SocialSecurityNumber'][3:5]
it40pnrsa['SSN3'] = personal['SocialSecurityNumber'][5:]

it40pnrsd['FullName'] = '%s %s %s' % (personal['FirstName'], personal['MiddleInitial'], personal['LastName'])
it40pnrsd['SSN1'] = personal['SocialSecurityNumber'][:3]
it40pnrsd['SSN2'] = personal['SocialSecurityNumber'][3:5]
it40pnrsd['SSN3'] = personal['SocialSecurityNumber'][5:]

it40pnrsh['FullName'] = '%s %s %s' % (personal['FirstName'], personal['MiddleInitial'], personal['LastName'])
it40pnrsh['SSN1'] = personal['SocialSecurityNumber'][:3]
it40pnrsh['SSN2'] = personal['SocialSecurityNumber'][3:5]
it40pnrsh['SSN3'] = personal['SocialSecurityNumber'][5:]

ct40pnr['FullName'] = '%s %s %s' % (personal['FirstName'], personal['MiddleInitial'], personal['LastName'])
ct40pnr['SSN1'] = personal['SocialSecurityNumber'][:3]
ct40pnr['SSN2'] = personal['SocialSecurityNumber'][3:5]
ct40pnr['SSN3'] = personal['SocialSecurityNumber'][5:]


########################################
# Write form data to file

with open(data_dir+'/it40pnr.json', "wb") as output:
  json.dump(it40pnr, output)

with open(data_dir+'/it40pnr-sa.json', "wb") as output:
  json.dump(it40pnrsa, output)

with open(data_dir+'/it40pnr-sd.json', "wb") as output:
  json.dump(it40pnrsd, output)

with open(data_dir+'/it40pnr-sh.json', "wb") as output:
  json.dump(it40pnrsh, output)

with open(data_dir+'/ct40pnr.json', "wb") as output:
  json.dump(ct40pnr, output)

