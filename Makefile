########################################
# Setup Env

SHELL=/bin/bash

# Input sources
docs=$(shell find docs -type f)
history_dir=docs/history
history_src=$(shell find $(history_dir) -type f -name "*.csv")
mappings=ops/mappings

# Output folders
forms=build/forms
data=build/data
pages=build/pages
example=build/example
labels=build/labels
labels_data=$(labels)/data
example_data=$(example)/data
example_pages=$(example)/pages

# Create output folders
$(shell mkdir -p $(forms) $(data) $(example_data) $(labels_data) $(pages) $(example_pages))

# Helper functions
log_start=@echo;echo "=============";echo "[Makefile] => Start building $@"

########################################
# Shortcut/Helper Rules
.PHONY: tax-return.pdf # always build this

default: tx-history

example: federal-example
labels: federal-labels
all: federal federal-example
federal: build/federal-tax-return.pdf
federal-example: build/example/federal-tax-return.pdf
federal-labels: build/labels/federal-tax-return.pdf

backup:
	tar czf tax_backup.tar.gz personal.json docs

clean:
	find build -type f -not -path "$(forms)/*" -exec rm -v {} \;

purge:
	rm -rf build

########################################
# Build components of our tax return



$(labels)/federal-tax-return.pdf: $(labels_data)/f1040
	$(log_start)
	bash src/build.sh federal $(forms) $(mappings) $(labels_data) $(labels_pages) $(labels)

$(labels_data)/f1040: src/f1040.py $(docs)
	$(log_start)
	python src/f1040.py labels.json $(labels_data) $(data)
	touch $@

tx-history:
	$(log_start)
	node src/parse-history.js personal.json



build/federal-tax-return.pdf: ops/build.sh $(forms)/federal $(src) $(data)/f1040 $(data)/f1040s1 $(data)/f1040s3 $(data)/f1040s4 $(data)/f1040sc $(data)/f1040sse $(data)/f1040sd $(data)/f8949 $(data)/f8889
	$(log_start)
	bash ops/build.sh federal $(forms) $(mappings) $(data) $(pages) build

$(example)/federal-tax-return.pdf: ops/build.sh $(forms)/federal $(src) $(example_data)/f1040 $(example_data)/f1040s1 $(example_data)/f1040s3 $(example_data)/f1040s4 $(example_data)/f1040sse $(example_data)/f1040sc $(example_data)/f1040sd $(example_data)/f8949 $(example_data)/f8889
	$(log_start)
	bash ops/build.sh federal $(forms) $(mappings) $(example_data) $(example_pages) $(example)

########################################
# Example form data

$(example_data)/%: src/example/%.json
	$(log_start)
	cp src/example/$*.json $(example_data)/$*.json;
	touch $@

$(labels_data)/%: src/labels/%.json
	$(log_start)
	cp docs/labels/$*.json $(labels_data)/$*.json;
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
	cp src/f8949*.json $(data) || true
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

$(forms)/federal:
	$(log_start)
	bash ops/fetch.sh federal
	touch $@

# Any random federal form can be downloaded & parsed via a command line:
# make build/forms/i1040
$(forms)/%:
	wget "https://www.irs.gov/pub/irs-pdf/$*.pdf" --output-document="$(forms)/$*.pdf"
	pdftk $(forms)/$*.pdf dump_data_fields > $(forms)/$*.fields
