 #!/usr/bin/env python
from fdfgen import forge_fdf
import sys
import json
import re

input_file = sys.argv[1]
fields_file = sys.argv[2]
mappings_file = sys.argv[3]
output_file = sys.argv[4]

# Load data from relevant files
with open(input_file, "rb") as input_data:
    input = json.load(input_data)
with open(mappings_file, "rb") as mappings_data:
    mappings = json.load(mappings_data)
with open(fields_file, "rb") as fields_data:
    fields = fields_data.read().decode("UTF-8").split('---')

# Build FDF data
data = []
for key in input:
  # Insert strings into text fields as-is
  if isinstance(input[key], (basestring)):
    data.append((mappings[key], input[key]))
  # Figure out the value needed to check this checkbox
  elif isinstance(input[key], (bool)):
    field = [field for field in fields if mappings[key] in field][0]
    fieldStateOption = re.search('FieldStateOption: (.*)', field, re.M).group(1)
    if input[key]:
      data.append((mappings[key], fieldStateOption))
    else:
      data.append((mappings[key], 0))

# Convert data to fdf format
fdf = forge_fdf("",data,[],[],[])

# Write fdf out to file
with open(output_file, "wb") as output:
    output.write(fdf)
