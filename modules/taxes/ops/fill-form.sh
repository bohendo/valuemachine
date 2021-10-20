#!/bin/bash
set -e

root="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." >/dev/null 2>&1 && pwd )"

target="$1"
if [[ -z "$target" ]]
then echo "Provide the target form name as the first & only arg" && exit 1
fi

fields="$root/docs/fields/$target.fields"
form="$root/docs/forms/$target.pdf"
output="/tmp/$target.pdf"

echo "Filing form $form"

cd /tmp

for input in $(
  find "/tmp" -type f -name "$target.json" -or -name "$target-*.json" |\
    sort -t '/' -k 4 -n |\
    tr '\n\r' ' '
); do

  if [[ ! -f "$input" ]]
  then echo "No input file detected at $input" && continue;
  else echo "Found a page of ${target} at ${input}"
  fi

  page=$(basename "${input#*-}" .json)
  if [[ -n "$page" ]]
  then
    fdf="/tmp/$target-$page.fdf"
    out="/tmp/$target-$page.pdf"
  else
    fdf="/tmp/$target.fdf"
    out="/tmp/$target.pdf"
  fi

  rm -rf "$fdf" "$out"

  echo "python ops/fill-form.py $input $fields $fdf"

  python "$root/ops/fill-form.py" "$input" "$fields" "$fdf"

  echo "pdftk $form fill_form $fdf output $out flatten"

  pdftk "$form" fill_form "$fdf" output "$out" flatten

done

all_pages="$(find "/tmp" -type f -name "$target-*.pdf" | sort -t '/' -k 4 -n | tr '\n\r' ' ')"
echo "Compiling pages: $all_pages"
# shellcheck disable=SC2086
pdftk $all_pages cat output "$output"
