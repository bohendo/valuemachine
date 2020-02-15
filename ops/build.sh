#!/bin/bash
set -e

target=$1
dir="`pwd`/build/$target"

data_dir="$dir/data"
pages_dir="$dir/pages"
forms_dir="ops/forms"
fields_dir="ops/fields"

page_number=0

forms="`cat $target.json | jq '.forms' | tr -d ' ,"[]' | tr '\n\r' ' '`"
mkdir -p $data_dir $pages_dir

echo "Building PDFs from form data..."

# This is the order in which forms will be combined into the final tax return
for form in $forms
do
  for page in `find $data_dir -maxdepth 1 -type f -name "${form}.json" -or -name "${form}_*.json" | sort`
  do
    # echo "Compiling $page to pdf"
    page="`basename ${page%.json}`"
    page_number=$(( ${page_number#0} + 1 ))
    if [[ "$page_number" -lt "10" ]]
    then page_number="0$page_number"
    fi
    json_data="$data_dir/$page.json"
    fields="$fields_dir/$form.fields"
    fdf_data="$data_dir/$page.fdf"
    empty_form="$forms_dir/$form.pdf"
    filled_form="$pages_dir/${page_number}_$page.pdf"
    # echo "  - python ops/fill-form.py $json_data $fields $fdf_data"
    python ops/fill-form.py $json_data $fields $fdf_data
    # echo "  - pdftk $empty_form fill_form $fdf_data output $filled_form flatten"
    pdftk $empty_form fill_form $fdf_data output $filled_form flatten
  done
done

all_pages="`find $pages_dir -type f -name "*.pdf" | sort | tr  '\n\r' ' '`"
# echo "pdftk $all_pages cat output $dir/tax-return.pdf"
pdftk $all_pages cat output $dir/tax-return.pdf
# echo
