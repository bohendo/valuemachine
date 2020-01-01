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
data=build/data
pages=build/pages

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
$(shell mkdir -p $(flags) $(data) $(pages))

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
	rm -rf build/*
	rm -rf $(flags)/*

purge:
	rm -rf build

########################################
# Build components of our tax return

example-tax-return: example-data $(shell find ops $(find_options))
	$(log_start)
	$(docker_run) "bash ops/build.sh $(data) $(pages)"
	$(log_finish) && mv -f $(totalTime) $(flags)/$@

example-data: example.json $(shell find src $(find_options))
	$(log_start)
	$(docker_run) "node src/entry.js example.json $(data)"
	$(log_finish) && mv -f $(totalTime) $(flags)/$@


personal-tax-return: personal-data $(shell find ops $(find_options))
	$(log_start)
	$(docker_run) "bash ops/build.sh $(data) $(pages)"
	$(log_finish) && mv -f $(totalTime) $(flags)/$@

personal-data: node-modules personal.json $(shell find src $(find_options))
	$(log_start)
	$(docker_run) "node src/entry.js personal.json $(data)"
	$(log_finish) && mv -f $(totalTime) $(flags)/$@


test-tax-return: test-data $(shell find ops $(find_options))
	$(log_start)
	$(docker_run) "bash ops/build.sh $(data) $(pages)"
	$(log_finish) && mv -f $(totalTime) $(flags)/$@

test-data: test.json $(shell find src $(find_options))
	$(log_start)
	$(docker_run) "node src/entry.js test.json $(data)"
	$(log_finish) && mv -f $(totalTime) $(flags)/$@

node-modules: builder package.json
	$(log_start)
	$(docker_run) "npm install"
	$(log_finish) && mv -f $(totalTime) $(flags)/$@

builder: ops/builder.dockerfile
	$(log_start)
	$(docker_run) "docker build --file ops/builder.dockerfile --tag $(project)_builder:latest ."
	$(log_finish) && mv -f $(totalTime) $(flags)/$@
