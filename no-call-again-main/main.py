import subprocess
import re
import os
import sys
import hashlib

user_code = input()
is_blacklist =  re.search(r'[{}()#%?]', user_code)
if is_blacklist:
	print("No hak pls!!!")
	sys.exit()

filename = hashlib.sha256(os.urandom(32)).hexdigest()+".c"
code = f"""
#define _GNU_SOURCE
#include <seccomp.h>
#include <stdio.h>
#include <unistd.h>

int sandbox(){{
    {user_code}
}}

int main(void)
{{
    scmp_filter_ctx ctx;
    ctx = seccomp_init(SCMP_ACT_ALLOW);
    if (!ctx) {{
        perror("seccomp_init");
        return 1;
    }}
    seccomp_rule_add(ctx, SCMP_ACT_KILL, SCMP_SYS(execve), 0);
    if (seccomp_load(ctx) < 0) {{
        perror("seccomp_load");
        seccomp_release(ctx);
        return 1;
    }}

    seccomp_release(ctx);
    printf("No hacking pls!\\n");
    sandbox();
    return 0;
}}

"""
os.chdir("/tmp")
with open(filename, "w") as f:
	f.write(code)

binary_name = hashlib.sha256(os.urandom(32)).hexdigest()
returncode = subprocess.call(["gcc", filename, "-lseccomp", "-Werror", "-O0", "-o", binary_name], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, cwd="/tmp")
if returncode != 0:
	os.unlink(filename)
	sys.exit()

subprocess.call([f"./{binary_name}"], stdin=sys.stdin,stdout=sys.stdout,stderr=sys.stderr, cwd="/tmp")
os.unlink(filename)
os.unlink(binary_name)