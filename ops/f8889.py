#!/bin/python
import sys
from utils import *

########################################
# Read data from input files

src_dir=sys.argv[1]
build_dir=sys.argv[2]
data_dir=sys.argv[3]

personal = loadJSON(src_dir+'/personal.json')
f8889=loadJSON(src_dir+'/f8889.json')

########################################
# Build the form

f8889['FullName'] = '%s %s %s' % (personal['FirstName'], personal['MiddleInitial'], personal['LastName'])
f8889['SocialSecurityNumber'] = personal['SpouseSocialSecurityNumber']

with open(data_dir+'/f8889.json', "wb") as output:
  json.dump(f8889, output)
