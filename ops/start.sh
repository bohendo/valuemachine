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

# shellcheck disable=SC1091
if [[ -f ".env" ]]
then source .env
fi

# alias env var to override what's in .env
FINANCES_PROD="${FINANCES_PROD:-false}";
FINANCES_LOG_LEVEL="${LOG_LEVEL:-$FINANCES_LOG_LEVEL}";

####################
## Docker registry & image version config

if [[ "$FINANCES_PROD" == "true" ]]
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
builder_image="${project}_builder:$version"

common="networks:
      - '$project'
    logging:
      driver: 'json-file'
      options:
          max-size: '100m'"

####################
## Proxy config

proxy_image="${project}_proxy:$version"
pull_if_unavailable "$proxy_image"

if [[ -z "$FINANCES_DOMAINNAME" ]]
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

echo "Proxy configured"

####################
## Webserver config

if [[ "$FINANCES_PROD" == "true" ]]
then
  webserver_image="${project}_webserver:$version"
  pull_if_unavailable "$webserver_image"
  webserver_url="webserver:80"
  webserver_service="webserver:
    $common
    image: '$webserver_image'"

else
  webserver_url="webserver:3000"
  webserver_service="webserver:
    $common
    image: '${project}_builder:$version'
    entrypoint: bash
    command:
     - '-c'
     - 'cd modules/client && npm run start'
    volumes:
      - '$root:/root'"
fi

echo "Webserver configured"

####################
## Server config

server_port=8080;

if [[ "$FINANCES_PROD" == "true" ]]
then
  image_name="${project}_server:$version"
  pull_if_unavailable "$image_name"
  server_image="image: $image_name
    volumes:
      - 'data:/data'"
else
  server_image="${project}_builder:$version"
  server_image="image: '${project}_builder'
    entrypoint: 'bash'
    command: 'modules/server/ops/entry.sh'
    ports:
     - '$server_port:$server_port'
    volumes:
      - '$root:/root'
      - 'data:/data'"
fi

echo "Server configured"

####################
# Launch stack

echo "Launching finances stack"

cat - > $root/docker-compose.yml <<EOF
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
      FINANCES_SERVER_URL: 'server:$server_port'
      FINANCES_WEBSERVER_URL: '$webserver_url'
    volumes:
      - 'certs:/etc/letsencrypt'

  server:
    $common
    $server_image
    environment:
      FINANCES_ADMIN_TOKEN: '$FINANCES_ADMIN_TOKEN'
      FINANCES_ETHERSCAN_KEY: '$FINANCES_ETHERSCAN_KEY'
      FINANCES_ETH_PROVIDER: '$FINANCES_ETH_PROVIDER'
      FINANCES_LOG_LEVEL: '$FINANCES_LOG_LEVEL'
      FINANCES_PORT: '$server_port'
      NODE_ENV: '`
        if [[ "$FINANCES_PROD" == "true" ]]; then echo "production"; else echo "development"; fi
      `'


  $webserver_service

EOF

docker stack deploy -c $root/docker-compose.yml $project

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
