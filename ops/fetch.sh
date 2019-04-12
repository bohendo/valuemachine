#!/bin/bash
set -e

source="${1:-indiana}"
name="${2}"
forms="build/forms"

if [[ -n "$name" ]]
then
  url="`cat ops/sources/$source.json | jq '.["'$name'"]' | tr -d '"'`"

  echo "curl -s $url > $forms/$name.pdf"
  curl -s $url > $forms/$name.pdf
  echo "pdftk $forms/$name.pdf dump_data_fields > $forms/$name.fields"
  pdftk $forms/$name.pdf dump_data_fields > $forms/$name.fields

else
  names="`cat ops/sources/$source.json | jq keys | tr -d ' ,"[]' | tr '\n\r' ' '`"
  for name in $names
  do
    url="`cat ops/sources/$source.json | jq '.["'$name'"]' | tr -d '"'`"

    echo "curl -s $url > $forms/$name.pdf"
    curl -s $url > $forms/$name.pdf
    echo "pdftk $forms/$name.pdf dump_data_fields > $forms/$name.fields"
    pdftk $forms/$name.pdf dump_data_fields > $forms/$name.fields

  done

fi
