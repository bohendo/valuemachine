#!/usr/bin/env bash
set -e

format='{printf("| %-32s|%8s  ->  %-8s|\n", $1, $3, $4)}'

echo "==== Module: project root"
npm outdated -D | tail -n +2 | awk '$3 != $4' | awk "$format"
echo

cd modules
for module in `ls`
do
  echo "===== Module: $module"
  cd $module
  mv package.json package.json.backup
  cat package.json.backup | sed /@finances/d > package.json
  npm outdated | tail -n +2 | awk '$3 != $4' | awk "$format"
  echo "-----"
  npm outdated -D | tail -n +2 | awk '$3 != $4' | awk "$format"
  rm package.json
  mv package.json.backup package.json
  cd ..
  echo
done
