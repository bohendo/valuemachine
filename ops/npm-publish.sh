#!/usr/bin/env bash
set -e

# Order Matters!
# This is the order they'll be published in, dependencies should come before dependents
packages="types utils transactions core package react"

root=$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." >/dev/null 2>&1 && pwd )
project=$(grep -m 1 '"name":' "$root/package.json" | cut -d '"' -f 4)

########################################
## Helper functions

function get_latest_version {
  echo "$@" | tr ' ' '\n' | sort --version-sort --reverse | head -n 1
}

########################################
## Run some sanity checks to make sure we're really ready to npm publish

if [[ ! "$(pwd | sed 's|.*/\(.*\)|\1|')" =~ $project ]]
then echo "Aborting: Make sure you're in the $project project root" && exit 1
fi

# set root package version manually
package_versions=""

echo
echo "Checking npm registry for latest package version.."
for package in $packages
do
  package_name=$(grep '"name":' "modules/$package/package.json" | awk -F '"' '{print $4}')
  package_version=$(npm view "$package_name" version 2> /dev/null || echo "0.0.0")
  package_versions="$package_versions $package_version"
  echo "- $package_name@$package_version"
done
echo

highest_version=$(get_latest_version "$package_versions")

echo "What version of ${project} are we publishing?"
echo "Currently, latest version: $highest_version"
read -p "> " -r
echo
target_version="$REPLY" # get version from user input

if [[ -z "$target_version" ]]
then echo "Aborting: A new, unique version is required" && exit 1
elif [[ "$package_versions" =~ $target_version ]]
then echo "Aborting: A new, unique version is required" && exit 1
elif [[ "$(get_latest_version "$package_versions" "$target_version")" != "$target_version" ]]
then
  for package in $packages
  do
    package_name=$(grep '"name":' "modules/$package/package.json" | awk -F '"' '{print $4}')
    # make sure this is still a unique version number, even though its old
    version_exists=$(npm view "$package_name@$target_version" version 2> /dev/null || echo "0.0.0")
    if [[ -z "$version_exists" ]]
    then echo "Safe to publish $package_name@$target_version"
    else echo "Aborting: version $package_name@$target_version already exists" && exit 1
    fi
  done
  echo
  echo "Are you sure you want to publish an old version number (y/n)?"
  read -p "> " -r
  if [[ ! "$REPLY" =~ ^[Yy]$ ]]
  then echo "Aborting: The new version should be bigger than old ones" && exit 1
  fi
fi

echo "Confirm: we'll publish the current code to npm as ${project}@$target_version (y/n)?"
read -p "> " -r
echo
if [[ ! "$REPLY" =~ ^[Yy]$ ]]
then echo "Aborting by user request" && exit 1 # abort!
fi

echo "Let's go"
make package

for package in $packages
do
  ( # () designates a subshell so we don't have to cd back to where we started afterwards
    cd "$root/modules/$package" || exit 1
    package_name=$(grep '"name":' "package.json" | awk -F '"' '{print $4}')
    version="$target_version"
    echo
    echo "Updating package $package_name to version $version"
    mv package.json .package.json
    sed 's/"version": ".*"/"version": "'"$version"'"/' < .package.json > package.json
    rm .package.json

    echo "Publishing $package_name"
    npm publish --access=public

    cd "$root/modules" || exit 1
    for module in */package.json
    do (
      echo "Updating $package_name references in $module to version $version"
      cd "${module%/*}"
      mv package.json .package.json
      sed 's|"'"$package_name"'": ".*"|"'"$package_name"'": "'"$version"'"|' < .package.json > package.json
      rm .package.json
    ) done
  )
done

echo
echo "Commiting & tagging our changes"
echo

# Create git tag
tag="npm-publish-$target_version"

git add .
git commit --allow-empty -m "npm publish ${project}@$target_version"
git tag "$tag"
git push origin HEAD --no-verify
git push origin "$tag" --no-verify
