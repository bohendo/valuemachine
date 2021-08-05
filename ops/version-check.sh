#!/usr/bin/env bash
set -e

root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." >/dev/null 2>&1 && pwd)

do_not_upgrade=''

if [[ -n "$do_not_upgrade" ]]
then
  # Create the sed command to remove any ignored packages
  filter_args=""
  for ignored in $do_not_upgrade
  do filter_args="$filter_args\<${ignored//\//\\/}\>\|"
  done
  filter_cmd="/\(${filter_args::-2}\)[^-]/d"
else
  filter_cmd='s/ / /' # no-op
fi
#echo "filtering packages to ignore with sed cmd '$filter_cmd'"

########################################
## Define Helper Functions

function printOutdated {
  package="$1"
  echo "===== $package"

  cd "$(dirname "$package")" || exit 1

  davidRes=$("$root/node_modules/.bin/david" || true)

  if [[ "$davidRes" == "All dependencies up to date" ]]
  then
    echo "$davidRes"
  else
    # shellcheck disable=SC2016
    format='{printf("| %-48s|%8s  ->  %-12s|\n", $1, $2, $3)}'
    table=$(echo "$davidRes" \
      | grep "│" \
      | grep -v "Name" \
      | tr '│' '|' \
      | sed 's/|\+/|/g' \
      | tr -d ' \t' \
      | cut -d "|" -f 2-4 \
      | tr '|' ' ' \
      | awk '$3 != $4' \
      | awk "$format" \
      | sed "$filter_cmd" \
    )
    upgrades=$(echo "$davidRes" \
      | grep "npm install" \
      | cut -d " " -f 4- \
      | tr ' ' '\n' \
      | sed "$filter_cmd" \
      | tr '\n' ' ' \
      | sed 's/\(^ \+\| \+$\)//g' \
    )

    if [[ -z "$table" ]]
    then echo "All packages are up to date"
    else
      echo "$table"
      echo
      # shellcheck disable=SC2016
      echo "for f in $upgrades; do bash ops/upgrade-package.sh "'"${f%@*}" "${f##*@}"'"; done"
    fi
  fi

  echo
  cd - > /dev/null
}

########################################
## Execute

printOutdated "package.json"
find modules/ -maxdepth 2 -type f -name "package.json" | while read -r package
do printOutdated "$package"
done
