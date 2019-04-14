#!/bin/python
import sys
from utils import *

########################################
# Read data from input files

src_dir=sys.argv[1]
build_dir=sys.argv[2]
data_dir=sys.argv[3]

personal = loadJSON(src_dir+'/personal.json')
f1040s3=loadJSON(src_dir+'/f1040s3.json')

########################################
# Build the form

f1040s3['FullName'] = getName(personal)
f1040s3['SocialSecurityNumber'] = personal['SpouseSocialSecurityNumber']

line55 = 0
for n in [48,49,50,51,52,53,54]:
  line55 += fromForm(f1040s3['Line'+str(n)], f1040s3['Line'+str(n)+'c'])

f1040s3['Line55'] = toForm(line55, 0)
f1040s3['Line55c'] = toForm(line55, 1)

with open(data_dir+'/f1040s3.json', "wb") as output:
  json.dump(f1040s3, output)

