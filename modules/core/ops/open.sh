#!/bin/bash

ops="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
target="$ops/forms/$1.pdf"

if [[ ! -f "$target" ]]
then bash $ops/fetch.sh $1
fi

xdg-open $target
