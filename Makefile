
########################################
# Setup Env

VPATH=build
SHELL=/bin/bash

pdftk=$(shell which pdftk)
#$(shell if [[ -z "$(pdftk)" ]]; then echo "Install pdftk first"; fi)
id=$(shell )

$(shell mkdir -p build/fdf build/fields)

coinbase_history=$(shell find history -name "*coinbase*")
etherscan_history=$(shell find history -name "*etherscan*")

########################################
# Shortcut/Helper Rules

default: all
all: f1040.pdf

clean:
	rm -rf build/*

########################################
# Real Rules

tx-history.csv: $(coinbase_history)
	@echo "processing $?"
	cat $(coinbase_history) | node scripts/coinbase-to-history.js > build/tx-history.csv

f1040.pdf: f1040.fdf
	pdftk forms/f1040.pdf fill_form data.fdf output build/f1040.pdf flatten

f1040.fdf: fdfgen f1040.dat scripts/fill-form.py
	python scripts/fill-form.py

f1040.dat: pdftk forms/f1040.pdf
	pdftk forms/f1040.pdf dump_data_fields > build/fields/f1040.dat

fdfgen:
	pip install fdfgen

pdftk:
	@if [[ -z "`which pdftk`" ]]; then echo "Install pdftk first" && exit 1; fi
