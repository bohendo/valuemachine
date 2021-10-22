########################################
# Setup Env

# Specify make-specific variables (VPATH = prerequisite search path)
VPATH=.flags
SHELL=/bin/bash

root=$(shell cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )
project=$(shell cat $(root)/package.json | jq .name | tr -d '"')
find_options=-type f -not -path "**/node_modules/**" -not -path "**/.*" -not -path "**/dist/**"

cwd=$(shell pwd)
commit=$(shell git rev-parse HEAD | head -c 8)
semver=v$(shell cat package.json | grep '"version":' | awk -F '"' '{print $$4}')

# Setup docker run time
# If on Linux, give the container our uid & gid so we know what to reset permissions to
# On Mac, the docker-VM takes care of this for us so pass root's id (ie noop)
my_id=$(shell id -u):$(shell id -g)
id=$(shell if [[ "`uname`" == "Darwin" ]]; then echo 0:0; else echo $(my_id); fi)
interactive=$(shell if [[ -t 0 && -t 2 ]]; then echo "--interactive"; else echo ""; fi)
docker_run=docker run --env=CI=${CI} --name=$(project)_builder $(interactive) --tty --rm --volume=$(cwd):/root $(project)_builder $(id)

# Pool of images to pull cached layers from during docker build steps
image_cache=$(shell if [[ -n "${CI}" || "${CI_SERVER}" == "yes" ]]; then echo "--cache-from=$(project)_builder:latest,$(project)_proxy:latest,$(project)_server:latest,$(project)_webserver:latest"; else echo ""; fi)

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
dev: proxy package
prod: proxy server-image webserver
all: dev prod

start: dev
	bash ops/start.sh

start-prod:
	VM_PROD=true bash ops/start.sh

start-storybook: react
	bash ops/start-storybook.sh

stop:
	bash ops/stop.sh

restart: dev stop
	bash ops/start.sh

restart-prod: stop
	VM_PROD=true bash ops/start.sh

restart-storybook:
	docker container stop $(project)_storybook
	bash ops/start-storybook.sh

clean: stop
	rm -rf modules/*/build
	rm -rf modules/*/dist
	rm -rf modules/*/node_modules
	rm -rf modules/*/.rollup.cache
	rm -rf .flags/*
	docker container prune -f

reset-images:
	rm -f .flags/proxy .flags/server-image .flags/webserver

purge: clean
	rm -rf package-lock.json

push: push-commit
push-commit:
	bash ops/push-images.sh latest
	bash ops/push-images.sh $(commit)
push-semver:
	bash ops/pull-images.sh $(commit)
	bash ops/tag-images.sh $(semver)
	bash ops/push-images.sh $(semver)

pull: pull-latest
pull-latest:
	bash ops/pull-images.sh latest
pull-commit:
	bash ops/pull-images.sh $(commit)
pull-semver:
	bash ops/pull-images.sh $(semver)

dls:
	@docker service ls && echo '=====' && docker container ls -a

lint:
	bash ops/lint.sh

test-utils: utils
	bash ops/test-unit.sh utils test
watch-utils: types
	bash ops/test-unit.sh utils watch

test-transactions: transactions
	bash ops/test-unit.sh transactions test
watch-transactions: utils
	bash ops/test-unit.sh transactions watch

test-core: core
	bash ops/test-unit.sh core test
watch-core: transactions
	bash ops/test-unit.sh core watch

test-taxes: taxes
	bash ops/test-unit.sh taxes test
watch-taxes: core
	bash ops/test-unit.sh taxes watch

run-example: package
	bash ops/test-unit.sh package test

test-all: package
	bash ops/test-unit.sh utils test
	@sleep 1
	bash ops/test-unit.sh transactions test
	@sleep 1
	bash ops/test-unit.sh core test
	@sleep 1
	bash ops/test-unit.sh package test

publish: package
	bash ops/npm-publish.sh

deploy:
	bash ops/deploy.sh

########################################
# Common Prerequisites

builder: $(shell find ops/builder $(find_options))
	$(log_start)
	docker build --file ops/builder/Dockerfile $(image_cache) --tag $(project)_builder:latest ops/builder
	docker tag $(project)_builder:latest $(project)_builder:$(commit)
	$(log_finish) && mv -f $(totalTime) .flags/$@

node-modules: builder package.json $(shell find modules/*/package.json $(find_options))
	$(log_start)
	$(docker_run) "lerna bootstrap --hoist"
	$(docker_run) "npm run post-install"
	$(log_finish) && mv -f $(totalTime) .flags/$@

########################################
# Typescript -> Javascript

types: node-modules $(shell find modules/types $(find_options))
	$(log_start)
	$(docker_run) "cd modules/types && npm run build"
	$(log_finish) && mv -f $(totalTime) .flags/$@

utils: types $(shell find modules/utils $(find_options))
	$(log_start)
	$(docker_run) "cd modules/utils && npm run build"
	$(log_finish) && mv -f $(totalTime) .flags/$@

transactions: utils types $(shell find modules/transactions $(find_options))
	$(log_start)
	$(docker_run) "cd modules/transactions && npm run build"
	$(log_finish) && mv -f $(totalTime) .flags/$@

core: transactions utils types $(shell find modules/core $(find_options))
	$(log_start)
	$(docker_run) "cd modules/core && npm run build"
	$(log_finish) && mv -f $(totalTime) .flags/$@

taxes: core transactions utils types $(shell find modules/taxes $(find_options))
	$(log_start)
	$(docker_run) "cd modules/taxes && npm run build"
	$(log_finish) && mv -f $(totalTime) .flags/$@

react: taxes core transactions utils types $(shell find modules/react $(find_options))
	$(log_start)
	$(docker_run) "cd modules/react && npm run build"
	$(log_finish) && mv -f $(totalTime) .flags/$@

package: react core transactions utils types $(shell find modules/package $(find_options))
	$(log_start)
	$(docker_run) "cd modules/package && npm run build"
	$(log_finish) && mv -f $(totalTime) .flags/$@

client: package modules/client/.env $(shell find modules/client $(find_options))
	$(log_start)
	$(docker_run) "cd modules/client && npm run build"
	$(log_finish) && mv -f $(totalTime) .flags/$@

server: taxes $(shell find modules/server $(find_options))
	$(log_start)
	$(docker_run) "cd modules/server && npm run build && touch src/index.ts"
	$(log_finish) && mv -f $(totalTime) .flags/$@

########################################
# Build docker images

proxy: $(shell find ops/proxy $(find_options))
	$(log_start)
	docker build --file ops/proxy/Dockerfile $(image_cache) --tag $(project)_proxy ops/proxy
	docker tag $(project)_proxy $(project)_proxy:$(commit)
	$(log_finish) && mv -f $(totalTime) .flags/$@

server-image: server $(shell find modules/server/ops $(find_options))
	$(log_start)
	docker build --file modules/server/ops/Dockerfile $(image_cache) --tag $(project) modules/server
	docker tag $(project) $(project):$(commit)
	$(log_finish) && mv -f $(totalTime) .flags/$@

webserver: client $(shell find modules/client/ops $(find_options))
	$(log_start)
	docker build --file modules/client/ops/Dockerfile $(cache_from) --tag $(project)_webserver:latest modules/client
	docker tag $(project)_webserver:latest $(project)_webserver:$(commit)
	$(log_finish) && mv -f $(totalTime) .flags/$@

########################################
# Extra rules

ssh-action: $(shell find ops/ssh-action $(find_options))
	docker build --file ops/ssh-action/Dockerfile --tag $(project)_ssh_action ops/ssh-action
	docker tag $(project)_ssh_action $(project)_ssh_action:$(commit)
