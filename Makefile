########################################
# Setup Env

SHELL=/bin/bash

# Output folders
data=build/data
pages=build/pages

find_options=-type f -not -path "*/node_modules/*" -not -name "*.swp" -not -path "*/.*" -not -name "*.log"

# Create output folders
$(shell mkdir -p $(data) $(pages))

# Helper functions
log_start=@echo;echo "=============";echo "[Makefile] => Start building $@"

########################################
# Shortcut/Helper Rules
.PHONY: tax-return.pdf # always build this

default: personal
example: example-tax-return
personal: personal-tax-return
test: test-tax-return
all: example personal test

backup:
	tar czf tax_backup.tar.gz personal.json docs

clean:
	find build -type f -exec rm -v {} \;

purge:
	rm -rf build

########################################
# Build components of our tax return

example-data: example.json $(shell find src $(find_options))
	node src/entry.js example.json $(data)

example-tax-return: example-data $(shell find ops $(find_options))
	bash ops/build.sh $(data) $(pages)

personal-data: personal.json $(shell find src $(find_options))
	node src/entry.js personal.json $(data)

personal-tax-return: personal-data $(shell find ops $(find_options))
	bash ops/build.sh $(data) $(pages)

test-data: test.json $(shell find src $(find_options))
	node src/entry.js test.json $(data)

test-tax-return: test-data $(shell find ops $(find_options))
	bash ops/build.sh $(data) $(pages)
