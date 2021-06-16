#!/usr/bin/env bash
set -e

# TODO: print command to upgrade all outdated packages?

do_not_upgrade='webpack'

# Create the sed command to remove any ignored packages
filter_cmd="/\("
for ignored in $do_not_upgrade
do filter_cmd="$filter_cmd  \"${ignored//\//\\/}\"\|"
done
filter_cmd="${filter_cmd::-2}\)/d"

########################################
## Define Helper Functions

function printOutdated {
  package="$1"
  backup="$package.backup"
  echo "===== $package"

  mv -f "$package" "$backup"
  sed "$filter_cmd" < "$backup" > "$package"
  cd "$(dirname "$package")" || exit 1

  # shellcheck disable=SC2016
  format='{printf("| %-48s|%8s  ->  %-12s|\n", $1, $3, $4)}'
  outdated=$({
    npm outdated | tail -n +2 | awk '$3 != $4' | awk "$format" &
    npm outdated -D | tail -n +2 | awk '$3 != $4' | awk "$format";
  } | sort -u)
  if [[ -z "$outdated" ]]
  then echo "All packages are up to date"
  else echo "$outdated"
  fi
  echo

  cd - > /dev/null
  mv -f "$backup" "$package"
}

# Ensures no temporarily edited package.json files get left behind if printOutdated exits abruptly
function cleanup {
  find modules/ -maxdepth 2 -type f -name "package.json.backup" | while read -r backup
  do mv -vf "$backup" "${backup%.backup}"
  done
}
trap cleanup SIGINT EXIT

########################################
## Execute

printOutdated "package.json"
find modules/ -maxdepth 2 -type f -name "package.json" | while read -r package
do printOutdated "$package"
done
