 #!/usr/bin/env python
from fdfgen import forge_fdf
import sys
import json
import re

# Load data from files passed in as args
json_data = json.load(open(sys.argv[1], "rb"))
fields = open(sys.argv[2], "rb").read().decode("UTF-8").split('---')
output_file = sys.argv[3]

# Build FDF data
data = []
for key in json_data:

    # Insert strings into text fields as-is
    if isinstance(json_data[key], (basestring)):
        data.append((key, json_data[key]))

    # Figure out the value needed to check this checkbox
    elif isinstance(json_data[key], (bool)):
        field = [field for field in fields if key in field]
        if len(field) == 0:
          print("Error: Key exists in data but not fields:", key);
          exit(1)
        fieldVal = field[0]
        if not re.search('FieldStateOption: ([^O].*)', fieldVal, re.M):
          print("Error: did you give a text field boolean input?", fieldVal);
          exit(1)
        fieldStateOption = re.search('FieldStateOption: ([^O].*)', fieldVal, re.M).group(1)
        fieldStateOptions = re.findall('FieldStateOption: ([^O].*)', fieldVal, re.M)
        onFlag = max(fieldStateOptions, key=len)
        if json_data[key]:
            data.append((key, onFlag))
        else:
            data.append((key, 0))

# Write fdf out to file
with open(output_file, "wb") as output:
    output.write(forge_fdf("",data,[],[],[]))
