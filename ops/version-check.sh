#!/usr/bin/env bash
set -e

root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." >/dev/null 2>&1 && pwd)

do_not_upgrade='webpack'

# Create the sed command to remove any ignored packages
filter_cmd="/^\("
for ignored in $do_not_upgrade
do filter_cmd="$filter_cmd${ignored//\//\\/}\|"
done
filter_cmd="${filter_cmd::-2}\)|/d"
echo "filtering according to cmd: $filter_cmd"

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
      | sed "$filter_cmd" \
      | tr '|' ' ' \
      | awk '$3 != $4' \
      | awk "$format"
    )
    upgrades=$(echo "$davidRes" | grep "npm install" | cut -d " " -f 4- | tr '\n\r' ' ')
    if [[ -z "$table" ]]
    then echo "All packages are up to date"
    else
      echo "$table"
      echo
      # shellcheck disable=SC2016
      echo "for f in $upgrades; do bash ops/upgrade-package.sh "'${f%@*} ${f##*@}'"; done"
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
