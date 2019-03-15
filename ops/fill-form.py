 #!/usr/bin/env python
from fdfgen import forge_fdf
import sys
import json

print('Lets go')

input_file = sys.argv[1]
mappings_file = sys.argv[2]
output_file = sys.argv[3]

with open(input_file, "rb") as input_data:
    input = json.load(input_data)
    with open(mappings_file, "rb") as mappings_data:
        mappings = json.load(mappings_data)

        fields = []
        for key in input:
          if isinstance(input[key], (basestring)):
            fields.append((mappings[key], input[key]))
          elif isinstance(input[key], (bool)):
            if input[key]:
              fields.append((mappings[key], 1))
            else:
              fields.append((mappings[key], 0))

        fdf = forge_fdf("",fields,[],[],[])

with open(output_file, "wb") as output:
   output.write(fdf)
