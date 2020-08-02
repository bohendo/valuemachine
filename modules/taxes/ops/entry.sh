#!/bin/bash
set -e

if [[ -d modules/taxes ]]
then cd modules/taxes
fi

input_file="$1"
basename="${input_file%.json}"

echo "[entry.sh] Processing input file $input_file"

if [[ ! -f "$input_file" ]]
then echo "Error: $input_file does not exist." && exit 1
fi

echo "[entry.sh] Generating $basename tax-return data"

build="build/$basename"
rm -rf $build
mkdir -p $build/data $build/pages

node build/src/entry.js $input_file

echo "[entry.sh] Compiling tax return data into PDFs"

echo "Building PDFs from form data..."

for data_page in `ls $build/data | sort -n`
do
  page="`basename ${data_page%.json}`"
  form="${page#*_}"
  json_data="$build/data/$page.json"
  fields="ops/fields/$form.fields"
  fdf_data="$build/data/$page.fdf"
  empty_form="ops/forms/$form.pdf"
  filled_form="$build/pages/$page.pdf"
  echo "  - python ops/fill-form.py $json_data $fields $fdf_data"
  python ops/fill-form.py $json_data $fields $fdf_data
  echo "  - pdftk $empty_form fill_form $fdf_data output $filled_form flatten"
  pdftk $empty_form fill_form $fdf_data output $filled_form flatten
done

all_pages="`find $build/pages -type f | sort -t '/' -k 4 -n | tr '\n\r' ' '`"
echo "Compiling pages: $all_pages"
pdftk $all_pages cat output $build/tax-return.pdf

ln -fs $build/tax-return.pdf tax-return.pdf
