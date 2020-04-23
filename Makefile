########################################
# Setup Env

# Specify make-specific variables (VPATH = prerequisite search path)
VPATH=.flags
SHELL=/bin/bash

dir=$(shell cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )
project=$(shell cat $(dir)/package.json | jq .name | tr -d '"')
find_options=-type f -not -path "**/node_modules/**" -not -path "**/.*"

# Important Folders
cwd=$(shell pwd)
example=modules/core/build/example
personal=modules/core/build/personal
test=modules/core/build/test

# Setup docker run time
# If on Linux, give the container our uid & gid so we know what to reset permissions to
# On Mac, the docker-VM takes care of this for us so pass root's id (ie noop)
my_id=$(shell id -u):$(shell id -g)
id=$(shell if [[ "`uname`" == "Darwin" ]]; then echo 0:0; else echo $(my_id); fi)
interactive=$(shell if [[ -t 0 && -t 2 ]]; then echo "--interactive"; else echo ""; fi)
docker_run=docker run --name=$(project)_builder $(interactive) --tty --rm --volume=$(cwd):/root $(project)_builder $(id)

# Helper functions
startTime=.flags/.startTime
totalTime=.flags/.totalTime
log_start=@echo "=============";echo "[Makefile] => Start building $@"; date "+%s" > $(startTime)
log_finish=@echo $$((`date "+%s"` - `cat $(startTime)`)) > $(totalTime); rm $(startTime); echo "[Makefile] => Finished building $@ in `cat $(totalTime)` seconds";echo "=============";echo

# Create output folders
$(shell mkdir -p .flags $(example)/data $(personal)/data $(test)/data)

########################################
# Command & Control Aliases

default: dev
dev: server
prod: client
all: test example personal

backup:
	tar czf tax_backup.tar.gz modules/core/.cache modules/core/docs modules/core/personal.json

clean:
	rm -rf build/*
	rm -rf .flags/*
	docker container prune -f

reset:
	rm -f modules/core/.cache/*/events.json
	rm -f modules/core/.cache/*/state.json
	rm -f modules/core/.cache/*/logs.json
	rm -f .flags/personal .flags/example .flags/test

mappings:
	node modules/core/ops/update-mappings.js -y

ln:
	ln -s modules/core/.cache/personal/events.json events.json
	ln -s modules/core/.cache/personal/chain-data.json chain-data.json
	ln -s modules/core/.cache/personal/state.json state.json
	ln -s modules/core/.cache/personal/logs.json logs.json
	ln -s modules/core/.cache/personal/prices.json prices.json

########################################
# Common Prerequisites

builder: $(shell find ops/builder $(find_options))
	$(log_start)
	docker build --file ops/builder/Dockerfile --tag $(project)_builder:latest ops/builder
	$(log_finish) && mv -f $(totalTime) .flags/$@

node-modules: builder $(shell find modules/*/package.json $(find_options))
	$(log_start)
	$(docker_run) "lerna bootstrap --hoist"
	$(log_finish) && mv -f $(totalTime) .flags/$@

########################################
# Typescript -> Javascript

types: node-modules $(shell find modules/types $(find_options))
	$(log_start)
	$(docker_run) "cd modules/types && tsc -p tsconfig.json"
	$(log_finish) && mv -f $(totalTime) .flags/$@

core: types $(shell find modules/core $(find_options))
	$(log_start)
	$(docker_run) "cd modules/core && tsc -p tsconfig.json"
	$(log_finish) && mv -f $(totalTime) .flags/$@

taxes: types core $(shell find modules/taxes $(find_options))
	$(log_start)
	$(docker_run) "cd modules/taxes && tsc -p tsconfig.json"
	$(log_finish) && mv -f $(totalTime) .flags/$@

client: core $(shell find modules/client $(find_options))
	$(log_start)
	$(docker_run) "cd modules/client && npm run build"
	$(log_finish) && mv -f $(totalTime) .flags/$@

server: core $(shell find modules/server $(find_options))
	$(log_start)
	$(docker_run) "cd modules/server && npm run build"
	$(log_finish) && mv -f $(totalTime) .flags/$@

########################################
# Build tax return

tax-return: personal
example: modules/core/example.json core $(shell find modules/core/ops $(find_options))
	$(log_start)
	$(docker_run) "node modules/core/build/src/entry.js example.json $(example)"
	@$(docker_run) "bash modules/core/ops/build.sh example"
	$(log_finish) && mv -f $(totalTime) .flags/$@

personal: modules/taxes/personal.json taxes $(shell find modules/taxes/ops $(find_options))
	$(log_start)
	$(docker_run) "cd modules/taxes && node build/src/entry.js personal.json build/personal"
	@$(docker_run) "bash modules/taxes/ops/build.sh personal"
	$(log_finish) && mv -f $(totalTime) .flags/$@

test: modules/core/test.json core $(shell find modules/core/ops $(find_options))
	$(log_start)
	$(docker_run) "NODE_ENV=test node modules/core/build/src/entry.js test.json $(test)"
	@$(docker_run) "bash modules/core/ops/build.sh test"
	$(log_finish) && mv -f $(totalTime) .flags/$@
