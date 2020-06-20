#!/usr/bin/env bash
set -e

dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
project="`cat $dir/../package.json | grep '"name":' | head -n 1 | cut -d '"' -f 4`"
registry="`cat $dir/../package.json | grep '"registry":' | head -n 1 | cut -d '"' -f 4`"

# Turn on swarm mode if it's not already on
docker swarm init 2> /dev/null || true

####################
# Load env vars

# alias env var
FINANCES_LOG_LEVEL="$LOG_LEVEL";

function extractEnv {
  grep "$1" "$2" | cut -d "=" -f 2- | tr -d '\n\r"' | sed 's/ *#.*//'
}

# First choice: use existing env vars (dotEnv not called)
function dotEnv {
  key="$1"
  if [[ -f .env && -n "`extractEnv $key .env`" ]] # Second choice: load from custom secret env
  then extractEnv $key .env
  elif [[ -f prod.env && -n "`extractEnv $key prod.env`" ]] # Third choice: load from public defaults
  then extractEnv $key prod.env
  fi
}

export FINANCES_DOMAIN_NAME="${FINANCES_DOMAIN_NAME:-`dotEnv FINANCES_DOMAIN_NAME`}"
export FINANCES_EMAIL="${FINANCES_EMAIL:-`dotEnv FINANCES_EMAIL`}"
export FINANCES_LOG_LEVEL="${FINANCES_LOG_LEVEL:-`dotEnv FINANCES_LOG_LEVEL`}"
export FINANCES_ADMIN_TOKEN="${FINANCES_ADMIN_TOKEN:-`dotEnv FINANCES_ADMIN_TOKEN`}"
export FINANCES_ETHERSCAN_KEY="${FINANCES_ETHERSCAN_KEY:-`dotEnv FINANCES_ETHERSCAN_KEY`}"

####################
# Internal Config
# config & hard-coded stuff you might want to change

number_of_services=3 # NOTE: Gotta update this manually when adding/removing services :(

server_port=8080;

# docker images
builder_image="${project}_builder"
proxy_image="${project}_proxy"
server_image="${project}_server"
webserver_image="${project}_webserver"

####################
# Deploy according to above configuration

mkdir -p /tmp/$project
cat - > /tmp/$project/docker-compose.yml <<EOF
version: '3.4'

volumes:
  data:
  certs:

services:

  proxy:
    image: '$proxy_image'
    environment:
      DOMAINNAME: '$FINANCES_DOMAIN_NAME'
      EMAIL: '$FINANCES_EMAIL'
      SERVER_URL: 'server:8080'
      WEBSERVER_URL: 'webserver:3000'
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - 'certs:/etc/letsencrypt'

  webserver:
    image: '$webserver_image'

  server:
    image: '$server_image'
    entrypoint: 'bash -c "cd modules/server && bash ops/entry.sh"'
    environment:
      FINANCES_ADMIN_TOKEN: '$FINANCES_ADMIN_TOKEN'
      FINANCES_ETHERSCAN_KEY: '$FINANCES_ETHERSCAN_KEY'
      FINANCES_LOG_LEVEL: '$FINANCES_LOG_LEVEL'
      FINANCES_PORT: '$server_port'
      NODE_ENV: 'development'
    ports:
      - '$server_port:$server_port'
    volumes:
      - 'data:/data'
EOF

docker stack deploy -c /tmp/$project/docker-compose.yml $project

echo -n "Waiting for the $project stack to wake up."
while [[ "`docker container ls | grep $project | wc -l | tr -d ' '`" != "$number_of_services" ]]
do echo -n "." && sleep 2
done
echo " Good Morning!"
