#!/bin/python
import sys
from utils import *

########################################
# Read data from input files

src_dir=sys.argv[1]
build_dir=sys.argv[2]
data_dir=sys.argv[3]

personal = loadJSON(src_dir+'/personal.json')
f1040sc=loadJSON(data_dir+'/f1040sc.json')
f1040sse=loadJSON(src_dir+'/f1040sse.json')

########################################
# Build the form

f1040sse['FullNamePage1'] = '%s %s %s' % (personal['FirstName'], personal['MiddleInitial'], personal['LastName'])
f1040sse['SocialSecurityNumberPage1'] = personal['SocialSecurityNumber']

profitOrLoss = fromForm(f1040sc['Line31'], f1040sc['Line31c'])

f1040sse['Line2'] = toForm(profitOrLoss, 0)
f1040sse['Line2c'] = toForm(profitOrLoss, 1)

f1040sse['Line3'] = toForm(profitOrLoss, 0)
f1040sse['Line3c'] = toForm(profitOrLoss, 1)

line4 = profitOrLoss * 0.9235
f1040sse['Line4'] = toForm(line4, 0)
f1040sse['Line4c'] = toForm(line4, 1)

if line4 >= 128400:
  line5 = (line4 * 0.029) + 5921.60
else:
  line5 = line4 * 0.153

f1040sse['Line5'] = toForm(line5, 0)
f1040sse['Line5c'] = toForm(line5, 1)

line6 = line5 * 0.5
f1040sse['Line6'] = toForm(line6, 0)
f1040sse['Line6c'] = toForm(line6, 1)

with open(data_dir+'/f1040sse.json', "wb") as output:
  json.dump(f1040sse, output)
