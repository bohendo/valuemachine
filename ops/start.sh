#!/usr/bin/env bash
set -e

root="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." >/dev/null 2>&1 && pwd )"
project="`cat $root/package.json | grep '"name":' | head -n 1 | cut -d '"' -f 4`"
registry="`cat $root/package.json | grep '"registry":' | head -n 1 | cut -d '"' -f 4`"

# turn on swarm mode if it's not already on
docker swarm init 2> /dev/null || true

# make sure a network for this project has been created
docker network create --attachable --driver overlay $project 2> /dev/null || true

####################
# Load env vars

FINANCES_ENV="${FINANCES_ENV:-dev}"

if [[ -f "$FINANCES_ENV.env" ]]
then source $FINANCES_ENV.env
fi

if [[ -f ".env" ]]
then source .env
fi

# alias env var to override what's in .env
FINANCES_LOG_LEVEL="$LOG_LEVEL";

####################
## Docker registry & image version config

if [[ "$FINANCES_ENV" == "prod" ]]
then version="`git rev-parse HEAD | head -c 8`"
else version="latest"
fi

# Get images that we aren't building locally
function pull_if_unavailable {
  if [[ -z "`docker image ls | grep ${1%:*} | grep ${1#*:}`" ]]
  then
    if [[ -n "`echo $1 | grep "${project}_"`" ]]
    then full_name="${registry%/}/$1"
    else full_name="$1"
    fi
    echo "Can't find image $1 locally, attempting to pull $full_name"
    docker pull $full_name
    docker tag $full_name $1
  fi
}

# Initialize new secrets (random if no value is given)
function new_secret {
  secret="$2"
  if [[ -z "$secret" ]]
  then secret=`head -c 32 /dev/urandom | xxd -plain -c 32 | tr -d '\n\r'`
  fi
  if [[ -z "`docker secret ls -f name=$1 | grep -w $1`" ]]
  then
    id=`echo "$secret" | tr -d '\n\r' | docker secret create $1 -`
    echo "Created secret called $1 with id $id"
  fi
}

echo "Using docker images ${project}_name:${version} "

####################
# Misc Config

# docker images
builder_image="${project}_builder"

common="networks:
      - '$project'
    logging:
      driver: 'json-file'
      options:
          max-size: '100m'"

####################
## Proxy config

proxy_image="${project}_proxy"
pull_if_unavailable "$proxy_image"

if [[ -z "$INDRA_DOMAINNAME" ]]
then
  public_url="http://localhost:3000"
  proxy_ports="ports:
      - '3000:80'"
else
  public_url="https://localhost:443"
  proxy_ports="ports:
      - '80:80'
      - '443:443'"
fi

####################
## Webserver config

webserver_image="${project}_webserver"
pull_if_unavailable "$webserver_image"

####################
## Server config

server_image="${project}_server"
pull_if_unavailable "$server_image"

server_port=8080;

####################
# Launch stack

cat - > $root/${project}.docker-compose.yml <<EOF
version: '3.4'

networks:
  $project:
    external: true

volumes:
  data:
  certs:

services:

  proxy:
    $common
    $proxy_ports
    image: '$proxy_image'
    environment:
      FINANCES_DOMAINNAME: '$FINANCES_DOMAINNAME'
      FINANCES_EMAIL: '$FINANCES_EMAIL'
      FINANCES_ETH_PROVIDER_URL: '$ETH_PROVIDER_URL'
      FINANCES_MESSAGING_TCP_URL: 'nats:4222'
      FINANCES_MESSAGING_WS_URL: 'nats:4221'
      FINANCES_NODE_URL: 'node:$node_port'
    volumes:
      - 'certs:/etc/letsencrypt'

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

docker stack deploy -c $root/${project}.docker-compose.yml $project

echo "The $project stack has been deployed, waiting for the proxy to start responding.."
timeout=$(expr `date +%s` + 180)
while true
do
  res="`curl -k -m 5 -s $public_url || true`"
  if [[ -z "$res" || "$res" == "Waiting for proxy to wake up" ]]
  then
    if [[ "`date +%s`" -gt "$timeout" ]]
    then echo "Timed out waiting for proxy to respond.." && exit
    else sleep 2
    fi
  else echo "Good Morning!" && exit;
  fi
done
