#!/bin/bash
set -e

source="$1"

forms_dir="$2"
mappings_dir="$3"
data_dir="$4"
pages_dir="$5/$source"
output_dir="$6"
page_number=0

forms="`cat ops/sources/$source.json | jq '.data | sort_by(.order) | map(.name)' | tr -d ' ,"[]' | tr '\n\r' ' '`"
mkdir -p $pages_dir

# This is the order in which forms will be combined into the final tax return
for form in $forms
do
  echo; echo "Compiling form: $form"
  for page in `find $data_dir -maxdepth 1 -type f -name "${form}.json" -or -name "${form}_*.json" | sort`
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

if [[ "$source" != "federal" ]]
then
  all_pages="`find $pages_dir -type f -name "*.pdf" | sort`"
  echo; echo "pdftk $all_pages cat output $output_dir/$source-tax-return.pdf"
  pdftk $all_pages cat output $output_dir/$source-tax-return.pdf
  exit
fi

if [[ -f "src/signature.pdf" ]]
then
  echo "Signing..."
  # Isolate the first page
  mv $pages_dir/01_f1040.pdf $pages_dir/f1040.pdf
  pdftk $pages_dir/f1040.pdf cat 1 output $pages_dir/01_unsigned_f1040.pdf
  pdftk $pages_dir/f1040.pdf cat 2-end output $pages_dir/01_02_f1040.pdf
  rm $pages_dir/f1040.pdf
  # Stamp on our signature
  pdfjam --paper 'letterpaper' --scale 0.25 --offset '-3.5cm 3.2cm' --outfile build/signature.pdf src/signature.pdf 
  pdftk $pages_dir/01_unsigned_f1040.pdf stamp build/signature.pdf output $pages_dir/01_signed_f1040.pdf
  rm $pages_dir/01_unsigned_f1040.pdf
  if [[ -f "src/spouse-signature.pdf" ]]
  then
    pdfjam --paper 'letterpaper' --scale 0.1 --offset '-4.5cm 2.3cm' --outfile build/spouse-signature.pdf src/spouse-signature.pdf 
    pdftk $pages_dir/01_signed_f1040.pdf stamp build/spouse-signature.pdf output $pages_dir/01_01_f1040.pdf
    rm $pages_dir/01_signed_f1040.pdf
  else
    mv $pages_dir/01_signed_f1040.pdf $pages_dir/01_01_f1040.pdf
  fi
fi

all_pages="`find $pages_dir -type f -name "*.pdf" | sort`"
attachments="`find src/attachments -type f -name "w2*.pdf" -maxdepth 1 | sort`"
echo; echo "pdftk $all_pages $attachments cat output $output_dir/$source-tax-return.pdf"
pdftk $all_pages $attachments cat output $output_dir/$source-tax-return.pdf
echo
