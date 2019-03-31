#!/bin/bash
set -e

forms="$1"
data="$2"
mappings="$3"
pages="$4"
order=0

# This is the order in which forms will be combined into the final tax return
for form in f1040 f1040sd f8949
do
  echo; echo "Compiling form: $form"
  for page in `find $data -type f -name "${form}.json" -or -name "${form}_[0-9]*.json" | sort`
  do
    echo "  page: $page"
    page="`basename ${page%.json}`"
    order=$(( $order + 1 ))
    json_data="$data/$page.json"
    fields="$forms/$form.fields"
    mapping="$mappings/$form.json"
    fdf_data="$data/$page.fdf"
    empty="$forms/$form.pdf"
    filled="$pages/${order}_$page.pdf"

    python ops/fill-form.py $json_data $fields $mapping $fdf_data

    pdftk $empty fill_form $fdf_data output $filled flatten

  done
done

pdftk `find $pages -type f | sort` cat output build/tax-return.pdf
echo
