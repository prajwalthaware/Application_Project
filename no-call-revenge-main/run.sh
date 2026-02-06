#!/bin/bash

cd /tmp || exit 1

read -r user_code

if [[ "$user_code" =~ [\{\}\(\)\#%\?] ]]; then
    echo "No hacking pls!!"
    exit 1
fi

if [[ "$user_code" == *"goto"* ]]; then
    echo "No hacking pls!!"
    exit 1
fi

src_file=$(mktemp XXXXXX.c)
binary_name="${src_file%.c}"

cat <<EOF > "$src_file"

int sandbox() {
    $user_code
}

void _start(void)
{
    sandbox();
}

EOF

timeout 60 gcc "$src_file" \
    -ffreestanding \
    -nostdlib \
    -Werror \
    -Wall \
    -static-pie \
    -O0 \
    -o "$binary_name" >/dev/null 2>&1

compile_status=$?

if [ $compile_status -ne 0 ]; then
    rm -f "$src_file"
    exit 1
fi

trap 'rm -f "$src_file" "$binary_name"' EXIT

/app/supervisor "./$binary_name"

