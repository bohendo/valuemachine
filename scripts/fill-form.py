 #!/usr/bin/env python
from fdfgen import forge_fdf
 
fields = [('topmostSubform[0].Page1[0].f1_02[0]', 'Batman')]
fdf = forge_fdf("",fields,[],[],[])

with open("build/fdf/f1040.fdf", "wb") as fdf_file:
   fdf_file.write(fdf)
