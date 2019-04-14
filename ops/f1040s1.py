#!/bin/python
import csv
import json
import sys
from os.path import isfile
from utils import *

########################################
# Read data from input files

src_dir=sys.argv[1]
build_dir=sys.argv[2]
data_dir=sys.argv[3]

personal=json.load(open(src_dir+'/personal.json', 'rb'))
f1040sc=json.load(open(data_dir+'/f1040sc.json'))
f1040sse=json.load(open(data_dir+'/f1040sse.json'))
f1040sd=json.load(open(data_dir+'/f1040sd.json'))

if isfile(src_dir+'/f1040s1.json'):
  f1040s1=json.load(open(src_dir+'/f1040s1.json'))
else:
  f1040s1={}

########################################
# Build the form

f1040s1['FullName'] = '%s %s %s' % (personal['FirstName'], personal['MiddleInitial'], personal['LastName'])
f1040s1['SocialSecurityNumber'] = personal['SocialSecurityNumber']

line12 = fromForm(f1040sc['Line31'], f1040sc['Line31c'])
f1040s1['Line12'] = toForm(line12, 0)
f1040s1['Line12c'] = toForm(line12, 1)

if float(f1040sd['Line16']) >= 0:
  line13 = float(f1040sd['Line16'])
else:
  line13 = float(f1040sd['Line21']) * -1

f1040s1['Line13'] = toForm(line13, 0)
f1040s1['Line13c'] = toForm(line13, 1)

line22 = 0
for line in [10,11,12,13,14,17,18,19,21]:
  value = fromForm(f1040s1['Line' + str(line)], f1040s1['Line'+str(line)+'c'])
  line22 += value
f1040s1['Line22'] = toForm(line22, 0)
f1040s1['Line22c'] = toForm(line22, 1)

line27 = fromForm(f1040sse['Line6'], f1040sse['Line6'])
f1040s1['Line27'] = toForm(line27, 0)
f1040s1['Line27c'] = toForm(line27, 1)

line36 = 0
for line in [23,24,25,26,27,28,29,30,'31a',32,33]:
  value = fromForm(f1040s1['Line' + str(line)], f1040s1['Line'+str(line)+'c'])
  line36 += value
f1040s1['Line36'] = toForm(line36, 0)
f1040s1['Line36c'] = toForm(line36, 1)

########################################
# Write form data to file

with open(data_dir+'/f1040s1.json', "wb") as output:
  json.dump(f1040s1, output)
