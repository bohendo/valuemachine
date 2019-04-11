########################################
# Setup Env

SHELL=/bin/bash
form_source=https://www.irs.gov/pub/irs-pdf

# Input sources
history_dir=src/attachments/history
history_src=$(shell find $(history_dir) -type f -name "*.csv")
mappings=ops/mappings

# Output folders
forms=build/forms
data=build/data
pages=build/pages
example=build/example
example_data=$(example)/data
example_pages=$(example)/pages

# Create output folders
$(shell mkdir -p $(forms) $(data) $(example_data) $(pages) $(example_pages))

# Helper functions
log_start=@echo "=============";echo "[Makefile] => Start building $@"; date "+%s" > build/.timestamp
log_finish=@echo "[Makefile] => Finished building $@ in $$((`date "+%s"` - `cat build/.timestamp`)) seconds";echo "=============";echo

########################################
# Shortcut/Helper Rules
.PHONY: tax-return.pdf # always build this

default: return
all: example return
example: build/example/tax-return.pdf
return: build/tax-return.pdf

clean:
	find build -type f -not -path "$(forms)/*" -exec rm -v {} \;

purge:
	rm -rf build

########################################
# Build components of our tax return

build/tax-return.pdf: forms $(data)/f1040 $(data)/f1040sc $(data)/f1040sd $(data)/f8949
	$(log_start)
	bash ops/build.sh $(forms) $(mappings) $(data) $(pages) build
	$(log_finish)

$(example)/tax-return.pdf: forms $(example_data)/f1040 $(example_data)/f1040s1 $(example_data)/f1040s4 $(example_data)/f1040sse $(example_data)/f1040sc $(example_data)/f1040sd $(example_data)/f8949
	$(log_start)
	bash ops/build.sh $(forms) $(mappings) $(example_data) $(example_pages) $(example)
	$(log_finish)

forms: $(forms)/f1040 $(forms)/f1040s1 $(forms)/f1040s4 $(forms)/f1040sse $(forms)/f1040sc $(forms)/f1040sd $(forms)/f8949

########################################
# form data

$(example_data)/%: src/example/%.json
	$(log_start)
	cp src/example/$*.json $(example_data)/$*.json
	touch $@
	$(log_finish)

$(data)/f1040: src/f1040.json
	$(log_start)
	cp src/f1040.json $(data)/f1040.json
	touch $@
	$(log_finish)

$(data)/f1040sc: ops/f1040sc.py src/income.json src/f1040.json src/f1040sc.json build/tx-history.csv
	$(log_start)
	python ops/f1040sc.py src/income.json src/f1040.json src/f1040sc.json build/tx-history.csv $(data)
	touch $@
	$(log_finish)

$(data)/f1040sd: $(data)/f8949
	$(log_start)
	python ops/f1040sd.py src/f1040.json $(data) $(data)/f8949*.json
	touch $@
	$(log_finish)

$(data)/f8949: ops/f8949.py src/starting-assets.json build/tx-history.csv src/f1040.json
	$(log_start)
	cp src/f8949*.json $(data)
	python ops/f8949.py src/starting-assets.json build/tx-history.csv src/f1040.json $(data)
	touch $@
	$(log_finish)

########################################
# Supporting data derived from raw source data

build/tx-history.csv: ops/generate-history.py $(history_src) src/address-book.json
	$(log_start)
	python ops/generate-history.py $(history_dir) src/address-book.json build/tx-history.csv
	$(log_finish)

########################################
# Form downloads & preprocessing

$(forms)/%:
	$(log_start)
	wget "$(form_source)/$*.pdf" --output-document="$(forms)/$*.pdf"
	pdftk $(forms)/$*.pdf dump_data_fields > $(forms)/$*.fields
	touch $@
	$(log_finish)

