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

# Create output folders
$(shell mkdir -p $(forms) $(data) $(pages))

# Helper functions
log_start=@echo "=============";echo "[Makefile] => Start building $@"; date "+%s" > build/.timestamp
log_finish=@echo "[Makefile] => Finished building $@ in $$((`date "+%s"` - `cat build/.timestamp`)) seconds";echo "=============";echo

########################################
# Shortcut/Helper Rules
.PHONY: tax-return.pdf # always build this

default: return
return: build/tax-return.pdf

clean:
	find build -type f -not -path "$(forms)/*" -exec rm -v {} \;

purge:
	rm -rf build

########################################
# Build components of our tax return

build/tax-return.pdf: forms $(data)/f1040 $(data)/f1040sd $(data)/f8949
	$(log_start)
	bash ops/build.sh $(forms) $(data) $(mappings) $(pages)
	$(log_finish)

forms: $(forms)/f1040 $(forms)/f1040sd $(forms)/f8949

########################################
# JSON data

$(data)/f1040:
	$(log_start)
	cp src/f1040.json $(data)/f1040.json
	touch $@
	$(log_finish)

$(data)/f1040sd:
	$(log_start)
	cp src/f1040sd.json $(data)/f1040sd.json
	touch $@
	$(log_finish)

$(data)/f8949: ops/capital-gains.py src/starting-assets.json build/tx-history.csv src/f1040.json
	$(log_start)
	python ops/capital-gains.py src/starting-assets.json build/tx-history.csv src/f1040.json $(data)
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

