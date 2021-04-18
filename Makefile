########################################
# Setup Env

# Specify make-specific variables (VPATH = prerequisite search path)
VPATH=.flags
SHELL=/bin/bash

root=$(shell cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )
project=$(shell cat $(root)/package.json | jq .name | tr -d '"')
find_options=-type f -not -path "**/node_modules/**" -not -path "**/.*" -not -path "**/build/**"

cwd=$(shell pwd)
commit=$(shell git rev-parse HEAD | head -c 8)

# Setup docker run time
# If on Linux, give the container our uid & gid so we know what to reset permissions to
# On Mac, the docker-VM takes care of this for us so pass root's id (ie noop)
my_id=$(shell id -u):$(shell id -g)
id=$(shell if [[ "`uname`" == "Darwin" ]]; then echo 0:0; else echo $(my_id); fi)
interactive=$(shell if [[ -t 0 && -t 2 ]]; then echo "--interactive"; else echo ""; fi)
docker_run=docker run --name=$(project)_builder $(interactive) --tty --rm --volume=$(cwd):/root $(project)_builder $(id)

# Pool of images to pull cached layers from during docker build steps
image_cache=$(shell if [[ "${CI_SERVER}" == "yes" ]]; then echo "--cache-from=$(project)_builder:latest,$(project)_proxy:latest,$(project)_server:latest,$(project)_webserver:latest"; else echo ""; fi)

# Helper functions
startTime=.flags/.startTime
totalTime=.flags/.totalTime
log_start=@echo "=============";echo "[Makefile] => Start building $@"; date "+%s" > $(startTime)
log_finish=@echo $$((`date "+%s"` - `cat $(startTime)`)) > $(totalTime); rm $(startTime); echo "[Makefile] => Finished building $@ in `cat $(totalTime)` seconds";echo "=============";echo

# Create output folders
$(shell mkdir -p .flags)

########################################
# Command & Control Aliases

default: dev
dev: proxy taxes
prod: dev server webserver
all: prod

start: dev
	bash ops/start.sh

start-prod:
	FINANCES_ENV=prod bash ops/start.sh

stop:
	bash ops/stop.sh

restart: dev stop
	bash ops/start.sh

restart-prod: stop
	FINANCES_ENV=prod bash ops/start.sh

backup: tax-return
	rm -rf /tmp/taxes
	mkdir /tmp/taxes
	if [[ -f build.log ]]; then cp build.log /tmp/taxes/build.log; fi
	cp -r modules/taxes/docs /tmp/taxes/docs
	cp -r .cache/personal /tmp/taxes/cache
	cp modules/taxes/personal.json /tmp/taxes/personal.json
	cp -r modules/taxes/build/personal/tax-return.pdf /tmp/taxes/tax-return.pdf
	cd /tmp && tar czf $(cwd)/tax_backup.tar.gz taxes

clean: stop
	rm -rf modules/*/build/**
	rm -rf .flags/*
	docker container prune -f

reset: stop
	rm -f .cache/*/events.json
	rm -f .cache/*/state.json
	rm -f .cache/*/transactions.json
	rm -f .flags/tax-return .flags/example-return .flags/test-return

reset-images:
	rm .flags/proxy .flags/server .flags/webserver

purge: clean reset

push:
	bash ops/push-images.sh

pull:
	bash ops/pull-images.sh

mappings:
	node modules/core/ops/update-mappings.js -y

ln:
	ln -s .cache/personal/events.json events.json
	ln -s .cache/personal/chain-data.json chain-data.json
	ln -s .cache/personal/state.json state.json
	ln -s .cache/personal/logs.json logs.json
	ln -s .cache/personal/prices.json prices.json

dls:
	@docker service ls && echo '=====' && docker container ls -a

test: taxes
	$(docker_run) "cd modules/taxes && npm run test"

########################################
# Common Prerequisites

builder: $(shell find ops/builder $(find_options))
	$(log_start)
	docker build --file ops/builder/Dockerfile $(image_cache) --tag $(project)_builder:latest ops/builder
	docker tag $(project)_builder:latest $(project)_builder:$(commit)
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

utils: node-modules $(shell find modules/utils $(find_options))
	$(log_start)
	$(docker_run) "cd modules/utils && tsc -p tsconfig.json"
	$(log_finish) && mv -f $(totalTime) .flags/$@

core: types utils $(shell find modules/core $(find_options))
	$(log_start)
	$(docker_run) "cd modules/core && tsc -p tsconfig.json"
	$(log_finish) && mv -f $(totalTime) .flags/$@

taxes: types utils core $(shell find modules/taxes $(find_options))
	$(log_start)
	$(docker_run) "cd modules/taxes && tsc -p tsconfig.json"
	$(log_finish) && mv -f $(totalTime) .flags/$@

client-bundle: core $(shell find modules/client $(find_options))
	$(log_start)
	$(docker_run) "cd modules/client && npm run build"
	$(log_finish) && mv -f $(totalTime) .flags/$@

server-bundle: core $(shell find modules/server $(find_options))
	$(log_start)
	$(docker_run) "cd modules/server && npm run build && touch src/entry.ts"
	$(log_finish) && mv -f $(totalTime) .flags/$@

########################################
# Build docker images

proxy: $(shell find ops/proxy $(find_options))
	$(log_start)
	docker build --file ops/proxy/Dockerfile $(image_cache) --tag $(project)_proxy ops/proxy
	docker tag $(project)_proxy $(project)_proxy:$(commit)
	$(log_finish) && mv -f $(totalTime) .flags/$@

server: server-bundle $(shell find modules/server/ops $(find_options))
	$(log_start)
	docker build --file modules/server/ops/Dockerfile $(image_cache) --tag $(project)_server modules/server
	docker tag $(project)_server $(project)_server:$(commit)
	$(log_finish) && mv -f $(totalTime) .flags/$@

webserver: client-bundle $(shell find ops/webserver $(find_options))
	$(log_start)
	docker build --file ops/webserver/nginx.dockerfile $(image_cache) --tag $(project)_webserver .
	docker tag $(project)_webserver $(project)_webserver:$(commit)
	$(log_finish) && mv -f $(totalTime) .flags/$@

########################################
# Build tax return

tax-return: modules/taxes/personal.json taxes $(shell find modules/taxes/ops $(find_options))
	$(log_start)
	$(docker_run) "cd modules/taxes && bash ops/entry.sh personal.json"
	ln -fs modules/taxes/tax-return.pdf tax-return.pdf
	$(log_finish) && mv -f $(totalTime) .flags/$@

example-return: modules/taxes/example.json taxes $(shell find modules/taxes/ops $(find_options))
	$(log_start)
	$(docker_run) "cd modules/taxes && bash ops/entry.sh example.json"
	ln -fs modules/taxes/tax-return.pdf tax-return.pdf
	$(log_finish) && mv -f $(totalTime) .flags/$@

test-return: modules/taxes/test.json taxes $(shell find modules/taxes/ops $(find_options))
	$(log_start)
	$(docker_run) "cd modules/taxes && bash ops/entry.sh test.json"
	ln -fs modules/taxes/tax-return.pdf tax-return.pdf
	$(log_finish) && mv -f $(totalTime) .flags/$@
