#!/bin/bash
set -e

root="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." >/dev/null 2>&1 && pwd )"
year="2020"
forms="$root/forms/$year"
mkdir -p "$forms"

name="$1"
if [[ -z "$name" ]]
then echo "Provide the form name to fetch as the first & only arg" && exit 1
fi

function cleanup {
  if [[ -f "$forms/$name.pdf" && ! -s "$forms/$name.pdf" ]]
  then rm -v "$forms/$name.pdf"
  fi
}
trap cleanup EXIT SIGINT

wget "https://www.irs.gov/pub/irs-pdf/$name.pdf" --output-document="$forms/$name.pdf"
