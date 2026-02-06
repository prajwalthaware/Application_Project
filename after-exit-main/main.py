import subprocess
import re
import os
import sys
import hashlib

user_code = input()
isValid =  re.match(r'^[A-Za-z0-9\.&^*+\-~/<>:%]+$', user_code)
if not isValid:
	print("No hak pls!!!")
	sys.exit()

filename = hashlib.sha256(os.urandom(32)).hexdigest()+".c"

code = f"""
#include<stdio.h>

{user_code}

int main(){{
	return 1;
}}
"""
with open(filename, "w") as f:
	f.write(code)

binary_name = hashlib.sha256(os.urandom(32)).hexdigest()
process = subprocess.Popen(["gcc", filename, "-o", binary_name], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
stdout, stderr = process.communicate()
if process.returncode != 0:
	print(f"Failed to compile : {stderr.decode()}")
	os.unlink(filename)
	sys.exit()

process = subprocess.Popen([f"./{binary_name}"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
stdout, stderr = process.communicate()
if process.returncode != 0:
	print(f"Failed to run : {stderr.decode()}")
	os.unlink(filename)
	os.unlink(binary_name)
	sys.exit()
print(stdout.decode())
os.unlink(filename)
os.unlink(binary_name)

