########################################
# Setup Env

# Specify make-specific variables (VPATH = prerequisite search path)
flags=.makeflags
VPATH=$(flags)
SHELL=/bin/bash

dir=$(shell cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )
project=$(shell cat $(dir)/package.json | jq .name | tr -d '"')
find_options=-type f -not -path "*/node_modules/*" -not -name "*.swp" -not -path "*/.*" -not -name "*.log"

# Important Folders
cwd=$(shell pwd)
example=build/example
personal=build/personal
test=build/test

# Setup docker run time
# If on Linux, give the container our uid & gid so we know what to reset permissions to
# On Mac, the docker-VM takes care of this for us so pass root's id (ie noop)
my_id=$(shell id -u):$(shell id -g)
id=$(shell if [[ "`uname`" == "Darwin" ]]; then echo 0:0; else echo $(my_id); fi)
docker_run=docker run --name=$(project)_builder --tty --rm --volume=$(cwd):/root $(project)_builder $(id)

# Helper functions
startTime=$(flags)/.startTime
totalTime=$(flags)/.totalTime
log_start=@echo "=============";echo "[Makefile] => Start building $@"; date "+%s" > $(startTime)
log_finish=@echo $$((`date "+%s"` - `cat $(startTime)`)) > $(totalTime); rm $(startTime); echo "[Makefile] => Finished building $@ in `cat $(totalTime)` seconds";echo "=============";echo

# Create output folders
$(shell mkdir -p $(flags) $(example)/data $(personal)/data $(test)/data)

########################################
# Shortcut/Helper Rules
.PHONY: tax-return.pdf # always build this

default: personal
all: test example personal

backup:
	tar czf tax_backup.tar.gz personal.json docs

clean:
	rm -rf build/*
	rm -rf $(flags)/*

purge:
	rm -rf build

mappings:
	node ops/update-mappings.js -y

########################################
# Build tax return

example: example.json taxes.js $(shell find ops $(find_options))
	$(log_start)
	$(docker_run) "node build/src/entry.js example.json $(example)"
	$(docker_run) "bash ops/build.sh example"
	$(log_finish) && mv -f $(totalTime) $(flags)/$@

personal: personal.json taxes.js $(shell find ops $(find_options))
	$(log_start)
	$(docker_run) "node build/src/entry.js personal.json $(personal)"
	$(docker_run) "bash ops/build.sh personal"
	$(log_finish) && mv -f $(totalTime) $(flags)/$@

test: test.json taxes.js $(shell find ops $(find_options))
	$(log_start)
	$(docker_run) "MODE=test node build/src/entry.js test.json $(test)"
	$(docker_run) "bash ops/build.sh test"
	$(log_finish) && mv -f $(totalTime) $(flags)/$@


########################################
# Common Prerequisites

taxes.js: node-modules mappings tsconfig.json $(shell find src $(find_options))
	$(log_start)
	$(docker_run) "tsc -p tsconfig.json"
	$(log_finish) && mv -f $(totalTime) $(flags)/$@

node-modules: builder package.json
	$(log_start)
	$(docker_run) "npm install"
	$(log_finish) && mv -f $(totalTime) $(flags)/$@

builder: ops/builder.dockerfile
	$(log_start)
	docker build --file ops/builder.dockerfile --tag $(project)_builder:latest .
	$(log_finish) && mv -f $(totalTime) $(flags)/$@
