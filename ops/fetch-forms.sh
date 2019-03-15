#!/usr/bin/env bash

dir="`cd "$(dirname "${BASH_SOURCE[0]}")/.." >/dev/null 2>&1 && pwd`"
source="https://www.irs.gov/pub/irs-pdf"
target="$dir/build/forms"
forms="
  f1040.pdf
  f1040es.pdf
  f1040s1.pdf
  f1040s4.pdf
  f1040sc.pdf
  f1040sce.pdf
  f1040sd.pdf
  f1040sse.pdf
  f8949.pdf
"

mkdir -p $target
for form in $forms
do wget "$source/$form" --output-document="$target/$form"
done
