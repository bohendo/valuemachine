
########################################
# Setup Env

# Visit the readme to help figure out which forms you need & which are supported
FORMS=f1040 #f1040sd # keeep trailing space

VPATH=build
SHELL=/bin/bash

empty=
space=$(empty) $(empty)
nforms=$(words $(FORMS))
forms=$(subst $(space),.pdf$(space),$(FORMS))
example_forms=$(wordlist 1,$(nforms),examples/$(subst $(space),$(space)examples/,$(forms)))

log_start=@echo "=============";echo "[Makefile] => Start building $@"; date "+%s" > build/.timestamp
log_finish=@echo "[Makefile] => Finished building $@ in $$((`date "+%s"` - `cat build/.timestamp`)) seconds";echo "=============";echo


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
	$(log_start)
	cd build && pdftk $(forms) cat output tax-return.pdf
	$(log_finish)

%.pdf: tools/pdftk field-data/%.fdf forms/%.pdf
	$(log_start)
	pdftk build/forms/$*.pdf fill_form build/field-data/$*.fdf output build/$*.pdf flatten
	$(log_finish)

field-data/%.fdf: tools/fdfgen ops/fill-form.py src/%.json ops/mappings/%.json fields/%.dat
	$(log_start)
	mkdir -p build/field-data
	python ops/fill-form.py src/$*.json fields/$*.dat ops/mappings/$*.json build/$@
	$(log_finish)

########################################
# Example returns

examples/tax-return.pdf: $(example_forms)
	$(log_start)
	cd build && pdftk $(example_forms) cat output examples/tax-return.pdf
	$(log_finish)

examples/%.pdf: tools/pdftk examples/field-data/%.fdf forms/%.pdf
	$(log_start)
	pdftk build/forms/$*.pdf fill_form build/examples/field-data/$*.fdf output build/examples/$*.pdf flatten
	$(log_finish)

examples/field-data/%.fdf: tools/fdfgen ops/fill-form.py src/examples/%.json ops/mappings/%.json fields/%.dat
	$(log_start)
	mkdir -p build/examples/field-data
	python ops/fill-form.py src/examples/$*.json build/fields/$*.dat ops/mappings/$*.json build/$@
	$(log_finish)

########################################
# Form downloads & preprocessing

fields/%.dat: tools/pdftk forms/%.pdf
	$(log_start)
	mkdir -p build/fields
	pdftk build/forms/$*.pdf dump_data_fields > build/fields/$*.dat
	$(log_finish)

forms/%.pdf:
	$(log_start)
	mkdir -p build/forms
	bash ops/fetch-forms.sh
	$(log_finish)

########################################
# Software Dependencies

tools/fdfgen:
	$(log_start)
	pip install fdfgen
	mkdir -p build/tools && touch build/$@
	$(log_finish)

tools/pdftk:
	$(log_start)
	@if [[ -z "`which pdftk`" ]]; then echo "Install pdftk first, see README for the link" && exit 1; fi
	mkdir -p build/tools && touch build/$@
	$(log_finish)
