#!/bin/bash

target="$1";

if [[ -z "$target" ]]
then echo "Exactly one arg required. Usage: search.sh <target>" && exit 1
fi

grep --exclude=*.swp --color=auto -r "$target" modules/*/src modules/*/ops
