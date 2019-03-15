 #!/usr/bin/env python
from fdfgen import forge_fdf
import sys
import json

form = sys.argv[1]
isExample = len(sys.argv) == 3

print("example mode:", isExample)
print(sys.argv)

print("Generating data for form: %s" % form)

with open("mappings/%s.json" % form, "rb") as mappings_file:
    mappings = json.load(mappings_file)
    with open("examples/%s.json" % form, "rb") as data_file:
        data = json.load(data_file)
        fields = []
        for key in data:
          if isinstance(data[key], (basestring)):
            fields.append((mappings[key], data[key]))
          elif isinstance(data[key], (bool)):
            if data[key]:
              fields.append((mappings[key], 1))
            else:
              fields.append((mappings[key], 0))

        fdf = forge_fdf("",fields,[],[],[])

with open("build/fdf/%s.fdf" % form, "wb") as fdf_file:
   fdf_file.write(fdf)
