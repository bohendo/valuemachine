#!/bin/python
import sys
from utils import *

########################################
# Read data from input files

src_dir=sys.argv[1]
build_dir=sys.argv[2]
data_dir=sys.argv[3]

personal = loadJSON(src_dir+'/personal.json')
f1040sse=loadJSON(data_dir+'/f1040sse.json')
f1040s4=loadJSON(src_dir+'/f1040s4.json')

########################################
# Build the form

f1040s4['FullName'] = getName(personal)
f1040s4['SocialSecurityNumber'] = personal['SocialSecurityNumber']

line57 = fromForm(f1040sse['Line5'], f1040sse['Line5c'])
f1040s4['Line57'] = toForm(line57, 0)
f1040s4['Line57c'] = toForm(line57, 1)

f1040s4['Line64'] = toForm(line57, 0)
f1040s4['Line64c'] = toForm(line57, 1)

with open(data_dir+'/f1040s4.json', "wb") as output:
  json.dump(f1040s4, output)
