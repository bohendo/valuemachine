#!/bin/bash
set -e

source="$1"

forms_dir="$2"
mappings_dir="$3"
data_dir="$4"
pages_dir="$5/$source"
output_dir="$6"
page_number=0

forms="`cat ops/sources/$source.json | jq keys | tr -d ' ,"[]' | tr '\n\r' ' '`"
mkdir -p $pages_dir

# This is the order in which forms will be combined into the final tax return
for form in $forms
do
  echo; echo "Compiling form: $form"
  for page in `find $data_dir -maxdepth 1 -type f -name "${form}.json" -or -name "${form}[-_]*.json" | sort`
  do
    echo "  page: $page"
    page="`basename ${page%.json}`"
    page_number=$(( ${page_number#0} + 1 ))
    if [[ "$page_number" -lt "10" ]]
    then page_number="0$page_number"
    fi
    json_data="$data_dir/$page.json"
    fields="$forms_dir/$form.fields"
    mappings="$mappings_dir/$form.json"
    fdf_data="$data_dir/$page.fdf"
    empty_form="$forms_dir/$form.pdf"
    filled_form="$pages_dir/${page_number}_$page.pdf"

    echo "  - python ops/fill-form.py $json_data $fields $mappings $fdf_data"
    python ops/fill-form.py $json_data $fields $mappings $fdf_data

    echo "  - pdftk $empty_form fill_form $fdf_data output $filled_form flatten"
    pdftk $empty_form fill_form $fdf_data output $filled_form flatten

  done
done

echo
echo "pdftk `find $pages_dir -type f | sort` cat output $output_dir/$source-tax-return.pdf"
pdftk `find $pages_dir -type f | sort` cat output $output_dir/$source-tax-return.pdf
echo
