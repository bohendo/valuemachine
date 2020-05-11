#!/bin/bash
set -e

if [[ -d modules/taxes ]]
then cd modules/taxes
fi

input_file="$1"

echo "[entry.sh] Processing input file $input_file"

if [[ ! -f "$input_file" ]]
then echo "Error: $input_file does not exist." && exit 1
fi

username="`cat $input_file | jq '.env.username' | tr -d '" '`"

echo "[entry.sh] Generating tax-return data for $username"

dir="build/$username"
rm -rf $dir
mkdir -p $dir/data $dir/pages

node build/src/entry.js $input_file

echo "[entry.sh] Compiling tax return data into PDFs"

echo "Building PDFs from form data..."

for data_page in `ls $dir/data | sort -n`
do
  page="`basename ${data_page%.json}`"
  form="${page#*_}"
  json_data="$dir/data/$page.json"
  fields="ops/fields/$form.fields"
  fdf_data="$dir/data/$page.fdf"
  empty_form="ops/forms/$form.pdf"
  filled_form="$dir/pages/$page.pdf"
  echo "  - python ops/fill-form.py $json_data $fields $fdf_data"
  python ops/fill-form.py $json_data $fields $fdf_data
  echo "  - pdftk $empty_form fill_form $fdf_data output $filled_form flatten"
  pdftk $empty_form fill_form $fdf_data output $filled_form flatten
done

all_pages="`find $dir/pages -type f | sort -t '/' -k 4 -n | tr '\n\r' ' '`"
echo "Compiling pages: $all_pages"
pdftk $all_pages cat output $dir/tax-return.pdf

ln -fs $dir/tax-return.pdf tax-return.pdf
