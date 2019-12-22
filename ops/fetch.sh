#!/bin/bash
set -e

name="${1}"
forms="ops/forms"
fields="ops/fields"

mkdir -p $forms $fields

function cleanup {
  if [[ -f "$forms/$name.pdf" && ! -s "$forms/$name.pdf" ]]
  then rm -v "$forms/$name.pdf"
  fi
  if [[ -f "$forms/$name.fields" && ! -s "$forms/$name.fields" ]]
  then rm -v "$forms/$name.fields"
  fi
}
trap cleanup EXIT SIGINT

if [[ -n "$name" ]]
then
  wget "https://www.irs.gov/pub/irs-pdf/$name.pdf" --output-document="$forms/$name.pdf"
  pdftk $forms/$name.pdf dump_data_fields > $fields/$name.fields
else
  names="`cat ops/sources.json | jq '.data | map(.name)' | tr -d ' ,"[]' | tr '\n\r' ' '`"
  for name in $names
  do
    url="`cat ops/sources.json | jq '.data | map(select(.name == "'$name'"))[0].url' | tr -d '"'`"
    echo "curl -s $url > $forms/$name.pdf"
    curl -s $url > $forms/$name.pdf
    echo "pdftk $forms/$name.pdf dump_data_fields > $fields/$name.fields"
    pdftk $forms/$name.pdf dump_data_fields > $fields/$name.fields
  done
fi
