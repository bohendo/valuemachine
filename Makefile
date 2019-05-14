########################################
# Setup Env

SHELL=/bin/bash

# Input sources
src=$(shell find src -type f)
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
log_start=@echo;echo "=============";echo "[Makefile] => Start building $@"

########################################
# Shortcut/Helper Rules
.PHONY: tax-return.pdf # always build this

default: federal indiana
example: federal-example indiana-example
all: federal indiana federal-example indiana-example
federal: build/federal-tax-return.pdf
indiana: build/indiana-tax-return.pdf
federal-example: build/example/federal-tax-return.pdf
indiana-example: build/example/indiana-tax-return.pdf

backup:
	tar czf tax_backup.tar.gz src

restore-backup:
	mv src old-src
	tar xvzf tax_backup.tar.gz

clean:
	find build -type f -not -path "$(forms)/*" -exec rm -v {} \;

purge:
	rm -rf build

########################################
# Build components of our tax return

build/federal-tax-return.pdf: ops/build.sh $(forms)/federal $(src) $(data)/f1040 $(data)/f1040s1 $(data)/f1040s3 $(data)/f1040s4 $(data)/f1040sc $(data)/f1040sse $(data)/f1040sd $(data)/f8949 $(data)/f8889 $(data)/f2210
	$(log_start)
	bash ops/build.sh federal $(forms) $(mappings) $(data) $(pages) build

$(example)/federal-tax-return.pdf: ops/build.sh $(forms)/federal $(src) $(example_data)/f1040 $(example_data)/f1040s1 $(example_data)/f1040s3 $(example_data)/f1040s4 $(example_data)/f1040sse $(example_data)/f1040sc $(example_data)/f1040sd $(example_data)/f8949 $(example_data)/f8889 $(example_data)/f2210
	$(log_start)
	bash ops/build.sh federal $(forms) $(mappings) $(example_data) $(example_pages) $(example)

build/indiana-tax-return.pdf: ops/build.sh $(forms)/indiana $(src) $(data)/indiana
	$(log_start)
	bash ops/build.sh indiana $(forms) $(mappings) $(data) $(pages) build

$(example)/indiana-tax-return.pdf: ops/build.sh $(forms)/indiana $(src) $(example_data)/ct40pnr $(example_data)/it40pnr $(example_data)/it40pnr-sa $(example_data)/it40pnr-sd $(example_data)/it40pnr-sh
	$(log_start)
	bash ops/build.sh indiana $(forms) $(mappings) $(example_data) $(example_pages) $(example)

########################################
# Example form data

$(example_data)/%: src/example/%.json
	$(log_start)
	cp src/example/$*.json $(example_data)/$*.json;
	touch $@

########################################
# Indiana form data

$(data)/indiana: ops/indiana.py $(src)
	$(log_start)
	python ops/indiana.py src $(data)
	touch $@

########################################
# Federal form data

$(data)/f2210: ops/f2210.py src/personal.json src/f2210.json build/tx-history.csv $(data)/f1040
	$(log_start)
	python ops/f2210.py src build $(data)
	touch $@

$(data)/f1040: ops/f1040.py $(src) $(data)/f1040s1 $(data)/f1040s3 $(data)/f1040s4
	$(log_start)
	python ops/f1040.py src build $(data)
	touch $@

$(data)/f1040s1: ops/f1040s1.py $(src) $(data)/f1040sc $(data)/f1040sse $(data)/f1040sd $(data)/f8889
	$(log_start)
	python ops/f1040s1.py src build $(data)
	touch $@

$(data)/f1040s3: ops/f1040s3.py src/personal.json
	$(log_start)
	python ops/f1040s3.py src build $(data)
	touch $@

$(data)/f1040s4: ops/f1040s4.py src/personal.json $(data)/f1040sse
	$(log_start)
	python ops/f1040s4.py src build $(data)
	touch $@

$(data)/f1040sse: ops/f1040sse.py $(src) $(data)/f1040sc
	$(log_start)
	python ops/f1040sse.py src build $(data)
	touch $@

$(data)/f1040sc: ops/f1040sc.py $(src) build/tx-history.csv
	$(log_start)
	python ops/f1040sc.py src build $(data)
	touch $@

$(data)/f1040sd: ops/f1040sd.py $(src) $(data)/f8949
	$(log_start)
	python ops/f1040sd.py src build $(data) $(data)/f8949*.json
	touch $@

$(data)/f8949: ops/f8949.py $(src) build/tx-history.csv
	$(log_start)
	cp src/f8949*.json $(data)
	python ops/f8949.py src build $(data)
	touch $@

$(data)/f8889: ops/f8889.py $(src)
	$(log_start)
	python ops/f8889.py src build $(data)
	touch $@

########################################
# Supporting data derived from raw source data

build/tx-history.csv: ops/generate-history.py $(history_src) src/personal.json
	$(log_start)
	python ops/generate-history.py $(history_dir) src/personal.json build/tx-history.csv

########################################
# Form downloads & preprocessing

$(forms)/indiana:
	$(log_start)
	bash ops/fetch.sh indiana
	touch $@

$(forms)/federal:
	$(log_start)
	bash ops/fetch.sh federal
	touch $@

# Any random federal form can be downloaded & parsed via a command line:
# make build/forms/i1040
$(forms)/%:
	wget "https://www.irs.gov/pub/irs-pdf/$*.pdf" --output-document="$(forms)/$*.pdf"
	pdftk $(forms)/$*.pdf dump_data_fields > $(forms)/$*.fields
