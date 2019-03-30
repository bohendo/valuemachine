 #!/usr/bin/env python
from fdfgen import forge_fdf
import sys
import json
import re

json_data = sys.argv[1]
field_names = sys.argv[2]
mappings_file = sys.argv[3]
output_file = sys.argv[4]

# Load data from relevant files
with open(json_data, "rb") as input_data:
    input = json.load(input_data)
with open(mappings_file, "rb") as mappings_data:
    mappings = json.load(mappings_data)
with open(field_names, "rb") as fields_data:
    fields = fields_data.read().decode("UTF-8").split('---')

# Build FDF data
data = []
for key in input:
    # First, make some sanity checks
    if not key in mappings:
        print('Error: Key exists in your input data but not the mappings:', key)
        exit(1)
    # Insert strings into text fields as-is
    if isinstance(input[key], (basestring)):
        data.append((mappings[key], input[key]))
    # Figure out the value needed to check this checkbox
    elif isinstance(input[key], (bool)):
        field = [field for field in fields if mappings[key] in field][0]
        fieldStateOption = re.search('FieldStateOption: ([^O].*)', field, re.M).group(1)
        if input[key]:
            data.append((mappings[key], fieldStateOption))
        else:
            data.append((mappings[key], 0))

# Write fdf out to file
with open(output_file, "wb") as output:
    output.write(forge_fdf("",data,[],[],[]))
