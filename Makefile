
########################################
# Setup Env

# Visit the readme to help figure out which forms you need & which are supported
FORMS=f1040 f1040sd f8949 # keeep trailing space
# f1040es.pdf f1040s1.pdf f1040s4.pdf f1040sc.pdf f1040sce.pdf f1040sse.pdf

VPATH=build
SHELL=/bin/bash

empty=
space=$(empty) $(empty)
nforms=$(words $(FORMS))
forms=$(subst $(space),.pdf$(space),$(FORMS))
filled_forms=$(wordlist 1,$(nforms),filled-forms/$(subst $(space),$(space)filled-forms/,$(forms)))

log_start=@echo "=============";echo "[Makefile] => Start building $@"; date "+%s" > build/.timestamp
log_finish=@echo "[Makefile] => Finished building $@ in $$((`date "+%s"` - `cat build/.timestamp`)) seconds";echo "=============";echo

history_dir=src/attachments/history
history_src=$(shell find $(history_dir) -type f -name "*.csv")

json-data=$(shell find build/json-data -type f)
field-names=$(shell find build/field-names -type f)
mappings=$(shell find ops/mappings -type f)

$(shell mkdir -p build/tools build/empty-forms build/field-names build/fdf-data build/fdf-data build/filled-forms)

########################################
# Shortcut/Helper Rules
.PHONY: tax-return.pdf # always build this

default: return
all: example return
example: examples/tax-return.pdf
return: tax-return.pdf

clean:
	find build -type f -not -path "build/empty-forms/*" -not -path "build/tools/*" -exec rm -v {} \;

########################################
# Build components of our tax return

tax-return.pdf: forms json-data/f1040 json-data/f1040sd json-data/f8949
	$(log_start)
	bash ops/build.sh
	$(log_finish)

forms: field-names/f1040.dat field-names/f1040sd.dat field-names/f8949.dat

########################################
# JSON data

json-data/f1040:
	$(log_start)
	cp src/f1040.json build/json-data/f1040.json
	touch build/json-data/f1040
	$(log_finish)

json-data/f1040sd:
	$(log_start)
	cp src/f1040sd.json build/json-data/f1040sd.json
	touch build/json-data/f1040sd
	$(log_finish)

json-data/f8949: ops/capital-gains.py src/starting-assets.json tx-history.csv src/f1040.json
	$(log_start)
	python ops/capital-gains.py src/starting-assets.json build/tx-history.csv src/f1040.json build/json-data/
	touch build/json-data/f8949
	$(log_finish)

########################################
# Supporting data derived from raw source data

tx-history.csv: ops/generate-history.py $(history_src) src/address-book.json
	$(log_start)
	python ops/generate-history.py $(history_dir) src/address-book.json build/tx-history.csv
	$(log_finish)

########################################
# Form downloads & preprocessing

field-names/%.dat: tools/pdftk empty-forms/%.pdf
	$(log_start)
	pdftk build/empty-forms/$*.pdf dump_data_fields > build/field-names/$*.dat
	$(log_finish)

empty-forms/%.pdf: ops/fetch-forms.sh
	$(log_start)
	bash ops/fetch-forms.sh $*
	$(log_finish)

########################################
# Software Dependencies

tools/fdfgen:
	$(log_start)
	pip install fdfgen
	touch build/$@
	$(log_finish)

tools/pdftk:
	$(log_start)
	@if [[ -z "`which pdftk`" ]]; then echo "Install pdftk first, see README for the link" && exit 1; fi
	touch build/$@
	$(log_finish)
