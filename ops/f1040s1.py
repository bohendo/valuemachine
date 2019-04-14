#!/bin/python
import sys
from utils import *

########################################
# Read data from input files

src_dir=sys.argv[1]
build_dir=sys.argv[2]
data_dir=sys.argv[3]

personal=loadJSON(src_dir+'/personal.json')
f1040s1=loadJSON(src_dir+'/f1040s1.json')
f1040=loadJSON(src_dir+'/f1040.json')

f1040sc=loadJSON(data_dir+'/f1040sc.json')
f1040sse=loadJSON(data_dir+'/f1040sse.json')
f1040sd=loadJSON(data_dir+'/f1040sd.json')
f8889=loadJSON(data_dir+'/f8889.json')

########################################
# Build the form

f1040s1['FullName'] = getName(personal)
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

# Health Savings Account
line25 = fromForm(f8889['Line13'], f8889['Line13c'])
f1040s1['Line25'] = toForm(line25, 0)
f1040s1['Line25c'] = toForm(line25, 1)

line27 = fromForm(f1040sse['Line6'], f1040sse['Line6'])
f1040s1['Line27'] = toForm(line27, 0)
f1040s1['Line27c'] = toForm(line27, 1)

# Student Loan Intereset Deduction
if not f1040['FilingMarriedSeparate']:
  interestPaid = personal['expenses']['StudentLoanInterest']
  interestPaid = 2500 if interestPaid > 2500 else interestPaid
  f1040s1['Line33'] = toForm(interestPaid, 0)
  f1040s1['Line33c'] = toForm(interestPaid, 1)

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
