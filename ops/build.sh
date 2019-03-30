#!/bin/bash

FORMS="f1040 f1040sd f8949"

function fill_form {
  form="$1"
  page="$2"
  order="$3"
  json_data="build/json-data/$page.json"
  field_names="build/field-names/$form.dat"
  mappings="ops/mappings/$form.json"
  fdf_data="build/fdf-data/$page.fdf"
  python ops/fill-form.py $json_data $field_names $mappings $fdf_data
  empty_form="build/empty-forms/$form.pdf"
  filled_form="build/filled-forms/$order-$page.pdf"
  pdftk $empty_form fill_form $fdf_data output $filled_form flatten
}

order=0
for form in $FORMS
do
  echo "form: $form"
  for page in `find build/json-data -type f -name "${form}.json" -or -name "${form}_[0-9]*.json" | sort`
  do
    echo "page: $page"
    page="`basename ${page%.json}`"
    form="${page%_*}"
    order=$(( $order + 1 ))
    fill_form $form $page $order
  done
done

pdftk `find build/filled-forms -type f | sort` cat output build/tax-return.pdf
