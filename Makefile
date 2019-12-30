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
personal: personal-tax-return

backup:
	tar czf tax_backup.tar.gz personal.json docs

clean:
	find build -type f -exec rm -v {} \;

purge:
	rm -rf build

########################################
# Build components of our tax return

personal-data: personal.json $(shell find src $(find_options))
	node src/entry.js personal.json $(data)

personal-tax-return: personal-data $(shell find ops $(find_options))
	bash ops/build.sh $(data) $(pages)
