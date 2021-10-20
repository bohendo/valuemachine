#!/bin/bash

root="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." >/dev/null 2>&1 && pwd )"

name="$1"

target="$root/docs/forms/$name.pdf"

if [[ ! -f "$target" ]]
then bash "$root/ops/fetch.sh" "$name"
fi

xdg-open "$target"
