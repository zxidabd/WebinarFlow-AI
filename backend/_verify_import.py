import os
import sys

os.chdir(os.path.join(os.path.dirname(__file__)))
sys.path.insert(0, ".")

import app.main

print("IMPORT_OK")
print("routes:", len(app.main.app.routes))
