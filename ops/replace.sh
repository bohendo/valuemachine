#!/bin/bash

old="$1"
new="$2"

if [[ -z "$old" || -z "$new" ]]
then echo "Exactly two args required. Usage: replace.sh <replace_this> <with_this>" && exit 1
fi

echo "Before:"
bash ops/search.sh $old

find modules/*/src modules/*/ops -type f -not -name "*.swp" -exec sed -i "s|$old|$new|g" {} \;

echo
echo "After:"
bash ops/search.sh $new
