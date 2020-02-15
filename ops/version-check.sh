#!/usr/bin/env bash
set -e

format='{printf("| %-32s|%8s  ->  %-8s|\n", $1, $3, $4)}'

echo
npm outdated -D | tail -n +2 | awk '$3 != $4' | awk "$format"
echo
