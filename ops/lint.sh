#!/usr/bin/env bash

root=$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." >/dev/null 2>&1 && pwd )
eslint="$root/node_modules/.bin/eslint -c $root/.eslintrc.js"

for packagePath in modules/*
do
  package=$(basename "$packagePath")
  echo "Linting ${package}"
  cd "${root}/modules/${package}" || exit 1
  if [[ -d "src" ]]
  then
    eval "$eslint 'src' $*"
  fi
  cd "${root}" || exit 1
done

if [[ -z "$*" ]]
then echo "Protip: run 'bash ops/lint.sh --fix' to auto-fix simple formatting inconsistencies"
fi
