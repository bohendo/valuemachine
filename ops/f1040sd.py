#!/bin/python
import json
import sys

haveQualifiedDividends = True

########################################
# Read data from input files

personal_data=json.load(open(sys.argv[1], 'rb'))
target=sys.argv[2]+'/f1040sd.json'
f8949_files=sys.argv[3:]

f1040sd = {}
f1040sd['FullName'] = personal_data['FirstNameAndInitial'] + ' ' + personal_data['LastName']
f1040sd['SocialSecurityNumber'] = personal_data['SocialSecurityNumber']

sum_fields = [
  "Line1bProceeds", "Line1bCost", "Line1bGainOrLoss",
  "Line2Proceeds", "Line2Cost", "Line2GainOrLoss",
  "Line3Proceeds", "Line3Cost", "Line3GainOrLoss",
  "Line8bProceeds", "Line8bCost", "Line8bGainOrLoss",
  "Line9Proceeds", "Line9Cost", "Line9GainOrLoss",
  "Line10Proceeds", "Line10Cost", "Line10GainOrLoss",
]

# Initialize totals to zero
for field in sum_fields:
  f1040sd[field] = 0

for f8949_file in f8949_files:
  f8949 = json.load(open(f8949_file, 'rb'))

  if f8949['isShortTermA']:
    f1040sd["Line1bProceeds"] += float(f8949['STTotalProceeds'])
    f1040sd["Line1bCost"] += float(f8949['STTotalCost'])
    f1040sd["Line1bGainOrLoss"] += float(f8949['STTotalGainOrLoss'])
  elif f8949['isShortTermB']:
    f1040sd["Line2Proceeds"] += float(f8949['STTotalProceeds'])
    f1040sd["Line2Cost"] += float(f8949['STTotalCost'])
    f1040sd["Line2GainOrLoss"] += float(f8949['STTotalGainOrLoss'])
  elif f8949['isShortTermC']:
    f1040sd["Line3Proceeds"] += float(f8949['STTotalProceeds'])
    f1040sd["Line3Cost"] += float(f8949['STTotalCost'])
    f1040sd["Line3GainOrLoss"] += float(f8949['STTotalGainOrLoss'])

  if f8949['isLongTermD']:
    f1040sd["Line8bProceeds"] += float(f8949['LTTotalProceeds'])
    f1040sd["Line8bCost"] += float(f8949['LTTotalCost'])
    f1040sd["Line8bGainOrLoss"] += float(f8949['LTTotalGainOrLoss'])
  elif f8949['isLongTermE']:
    f1040sd["Line9Proceeds"] += float(f8949['LTTotalProceeds'])
    f1040sd["Line9Cost"] += float(f8949['LTTotalCost'])
    f1040sd["Line9GainOrLoss"] += float(f8949['LTTotalGainOrLoss'])
  elif f8949['isLongTermF']:
    f1040sd["Line10Proceeds"] += float(f8949['LTTotalProceeds'])
    f1040sd["Line10Cost"] += float(f8949['LTTotalCost'])
    f1040sd["Line10GainOrLoss"] += float(f8949['LTTotalGainOrLoss'])

f1040sd["Line7"] = f1040sd["Line1bGainOrLoss"] + f1040sd["Line2GainOrLoss"] + f1040sd["Line3GainOrLoss"]
f1040sd["Line15"] = f1040sd["Line8bGainOrLoss"] + f1040sd["Line9GainOrLoss"] + f1040sd["Line10GainOrLoss"]
f1040sd["Line16"] = f1040sd["Line7"] + f1040sd["Line15"]

if f1040sd["Line16"] > 0:
  if f1040sd["Line7"] > 0 and f1040sd["Line15"] > 0:
    print('WARNING: Capital Gains not properly implemented, upgrade ops/f1040.py first!')
    f1040sd["Line17Yes"] = True
    f1040sd["Line17No"] = False

    f1040sd["Line18"] = 0 # TODO: 28% Rate Gain Worksheet

    f1040sd["Line19"] = 0 # TODO: Unrecaptured Section 1250 Gain Worksheet

    if f1040sd["Line18"] > 0 or f1040sd["Line19"] > 0:
      f1040sd["Line20Yes"] = False
      f1040sd["Line20No"] = True
      # TODO: Schedule D Tax Worksheet
    else:
      f1040sd["Line20Yes"] = True
      f1040sd["Line20No"] = False
      # TODO: Qualified Dividends and Capital Gain Tax Worksheet
      # DONE

  else:
    f1040sd["Line17Yes"] = False
    f1040sd["Line17No"] = True
    f1040sd["Line22"] = False
    # DONE

elif f1040sd["Line16"] < 0:
  f1040sd["Line21"] = abs(f1040sd["Line16"]) if abs(f1040sd["Line16"]) < 1500 else 1500
  f1040sd["Line22Yes"] = haveQualifiedDividends
  f1040sd["Line22No"] = not haveQualifiedDividends

elif f1040sd["Line16"] == 0:
  f1040sd["Line22Yes"] = haveQualifiedDividends
  f1040sd["Line22No"] = not haveQualifiedDividends

# Cast totals to strings
for field in sum_fields:
  f1040sd[field] = str(f1040sd[field])

f1040sd["Line7"] = str(f1040sd["Line7"])
f1040sd["Line15"] = str(f1040sd["Line15"])
f1040sd["Line16"] = str(f1040sd["Line16"])
f1040sd["Line21"] = str(f1040sd["Line21"])

with open(target, "wb") as output:
  json.dump(f1040sd, output)