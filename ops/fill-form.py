 #!/usr/bin/env python
from fdfgen import forge_fdf
import sys
import json
import re

# Load data from files passed in as args
json_data = json.load(open(sys.argv[1], "rb"))
fields = open(sys.argv[2], "rb").read().decode("UTF-8").split('---')
mappings = json.load(open(sys.argv[3], "rb"))
output_file = sys.argv[4]

# Build FDF data
data = []
for key in json_data:

    # First, make some sanity checks
    if not key in mappings:
        print('Error: Key exists in your input data but not the mappings:', key)
        exit(1)

    # Insert strings into text fields as-is
    if isinstance(json_data[key], str):
        data.append((mappings[key], json_data[key]))

    # Figure out the value needed to check this checkbox
    elif isinstance(json_data[key], (bool)):
        field = [field for field in fields if mappings[key] in field][0]
        fieldStateOption = re.search('FieldStateOption: ([^O].*)', field, re.M).group(1)
        fieldStateOptions = re.findall('FieldStateOption: ([^O].*)', field, re.M)
        onFlag = max(fieldStateOptions, key=len)
        if json_data[key]:
            data.append((mappings[key], onFlag))
        else:
            data.append((mappings[key], 0))

# Write fdf out to file
with open(output_file, "wb") as output:
    output.write(forge_fdf("",data,[],[],[]))
