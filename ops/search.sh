#!/bin/bash

grep --exclude=*.swp --color=auto -r "$1" modules/*/src modules/*/ops ops
