
########################################
# Setup Env

# Visit the readme to help figure out which forms you need & which are supported
FORMS=f1040 f1040sd # keeep trailing space

VPATH=build
SHELL=/bin/bash

empty=
space=$(empty) $(empty)
nforms=$(words $(FORMS))
forms=$(subst $(space),.pdf$(space),$(FORMS))
example_forms=$(wordlist 1,$(nforms),examples/$(subst $(space),$(space)examples/,$(forms)))

########################################
# Shortcut/Helper Rules

default: all
all: example return
example: examples/tax-return.pdf
return: tax-return.pdf

clean:
	rm -rf build/examples/* build/fields/* build/field-data/*

########################################
# Build components of our tax return

tax-return.pdf: $(forms)
	cd build && pdftk $(forms) cat output tax-return.pdf

%.pdf: tools/pdftk field-data/%.fdf forms/%.pdf
	pdftk build/forms/$*.pdf fill_form build/field-data/$*.fdf output build/$*.pdf flatten

field-data/%.fdf: tools/fdfgen ops/fill-form.py src/%.json ops/mappings/%.json
	mkdir -p build/field-data
	python ops/fill-form.py src/$*.json ops/mappings/$*.json build/$@

########################################
# Example returns

examples/tax-return.pdf: $(example_forms)
	cd build && pdftk $(example_forms) cat output examples/tax-return.pdf

examples/%.pdf: tools/pdftk examples/field-data/%.fdf forms/%.pdf
	pdftk build/forms/$*.pdf fill_form build/examples/field-data/$*.fdf output build/examples/$*.pdf flatten

examples/field-data/%.fdf: tools/fdfgen ops/fill-form.py src/examples/%.json ops/mappings/%.json
	mkdir -p build/examples/field-data
	python ops/fill-form.py src/examples/$*.json ops/mappings/$*.json build/$@

########################################
# Form downloads & preprocessing

fields/%.dat: tools/pdftk forms/%.pdf
	mkdir -p build/fields
	pdftk build/forms/$*.pdf dump_data_fields > build/fields/$*.dat

forms/%.pdf:
	mkdir -p build/forms
	bash ops/fetch-forms.sh

########################################
# Software Dependencies

tools/fdfgen:
	pip install fdfgen
	mkdir -p build/tools && touch build/$@

tools/pdftk:
	@if [[ -z "`which pdftk`" ]]; then echo "Install pdftk first, see README for the link" && exit 1; fi
	mkdir -p build/tools && touch build/$@
