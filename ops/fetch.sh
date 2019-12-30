#!/bin/bash
set -e

name="${1}"

ops="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
forms="$ops/forms"
fields="$ops/fields"

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
  names="`cat personal.json | jq '.forms' | tr -d ' ,"[]' | tr '\n\r' ' '`"
  for name in $names
  do
    url="https://www.irs.gov/pub/irs-pdf/$name.pdf"
    echo "curl -s $url > $forms/$name.pdf"
    curl -s $url > $forms/$name.pdf
    echo "pdftk $forms/$name.pdf dump_data_fields > $fields/$name.fields"
    pdftk $forms/$name.pdf dump_data_fields > $fields/$name.fields
  done
fi
