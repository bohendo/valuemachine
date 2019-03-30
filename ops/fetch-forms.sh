#!/usr/bin/env bash

form="${1%.pdf}.pdf"
irs="https://www.irs.gov/pub/irs-pdf"
target="build/empty-forms"
mkdir -p $target
wget "$irs/$form" --output-document="$target/$form"
