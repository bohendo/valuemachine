#!/bin/bash
set -e

root="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." >/dev/null 2>&1 && pwd )"

target="$1"
if [[ -z "$target" ]]
then echo "Provide the target form name as the first & only arg" && exit 1
fi

dir="$(cd "$(dirname "$target")" && pwd)"
form="$(basename "$target" .json)"
output="$dir/$form.pdf"

ops="$root/ops";
fields="$root/docs/fields/$form.fields"
empty_form="$root/docs/forms/$form.pdf"

tmp="/tmp/valuemachine"
mkdir -p "$tmp"

cd "$dir" || exit

echo "Filing $target forms w root=$root & cwd=$(pwd)"

for input in $(
  find . -maxdepth 1 -type f -name "$form.json" -or -name "$form-*.json" |\
    sort -t '/' -k 4 -n |\
    tr '\n\r' ' '
); do

  if [[ "$(basename "$input")" == *-* ]]
  then page="$(basename "${input#*-}" .json)"
  else page=""
  fi

  if [[ ! -f "$input" ]]
  then echo "No input file detected at $input" && continue;
  elif [[ -n "$page" ]]
  then echo "Found page $page of $form data at $input"
  else echo "Found 1 page of $form data at $input"
  fi

  if [[ -n "$page" ]]
  then
    fdf="$form-$page.fdf"
    out="$tmp/$form-$page.pdf"
  else
    fdf="$form.fdf"
    out="$tmp/$form.pdf"
  fi

  rm -rf "$fdf" "$out"

  echo "python $ops/fill-form.py $input $fields $fdf"

  python "$ops/fill-form.py" "$input" "$fields" "$fdf"

  echo "pdftk $form fill_form $fdf output $out flatten"

  pdftk "$empty_form" fill_form "$fdf" output "$out" flatten

done

all_pages="$(
  find "$tmp" -maxdepth 1 -type f -name "$form-*.pdf" -or -name "$form.pdf" |\
    sort -t '/' -k 4 -n |\
    tr '\n\r' ' '
)"
if [[ -z "$all_pages" ]]
then echo "No $form pages were generated"
else
  echo "Compiling pages: $all_pages"
  # shellcheck disable=SC2086
  pdftk $all_pages cat output "$output"
fi
