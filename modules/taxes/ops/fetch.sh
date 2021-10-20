#!/bin/bash
set -e

root="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." >/dev/null 2>&1 && pwd )"
forms="$root/docs/forms"
fields="$root/docs/fields"
mkdir -p "$forms" "$fields"

name="$1"
if [[ -z "$name" ]]
then echo "Provide the form name to fetch as the first & only arg" && exit 1
fi

function cleanup {
  if [[ -f "$forms/$name.pdf" && ! -s "$forms/$name.pdf" ]]
  then rm -v "$forms/$name.pdf"
  fi
  if [[ -f "$forms/$name.fields" && ! -s "$forms/$name.fields" ]]
  then rm -v "$forms/$name.fields"
  fi
}
trap cleanup EXIT SIGINT

wget "https://www.irs.gov/pub/irs-pdf/$name.pdf" --output-document="$forms/$name.pdf"
pdftk "$forms/$name.pdf" dump_data_fields > "$fields/$name.fields"
