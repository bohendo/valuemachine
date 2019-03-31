#!/bin/bash
set -e

forms_dir="$1"
mappings_dir="$2"
data_dir="$3"
pages_dir="$4"
output_dir="$5"
page_number=0

# This is the order in which forms will be combined into the final tax return
for form in f1040 f1040s1 f1040s4 f1040sse f1040sd f8949
do
  echo; echo "Compiling form: $form"
  for page in `find $data_dir -maxdepth 1 -type f -name "${form}.json" -or -name "${form}[-_]*.json" | sort`
  do
    echo "  page: $page"
    page="`basename ${page%.json}`"
    page_number=$(( $page_number + 1 ))
    json_data="$data_dir/$page.json"
    fields="$forms_dir/$form.fields"
    mappings="$mappings_dir/$form.json"
    fdf_data="$data_dir/$page.fdf"
    empty_form="$forms_dir/$form.pdf"
    filled_form="$pages_dir/${page_number}_$page.pdf"

    python ops/fill-form.py $json_data $fields $mappings $fdf_data

    pdftk $empty_form fill_form $fdf_data output $filled_form flatten

  done
done

pdftk `find $pages_dir -type f | sort` cat output $output_dir/tax-return.pdf
echo
