#!/bin/bash
set -e

target=$1

service_id="$(docker service ls --format '{{.ID}} {{.Name}}' |\
  grep "_$target" |\
  head -n 1 |\
  cut -d " " -f 1
)"

if [[ -z "$target" ]]
then
  echo "Provide the service name to check as the first & only arg"
  exit 1

elif [[ -z "$service_id" ]]
then
  echo "No service matches $target"
  docker service ls
  exit 1

elif ! grep -qs "Running" <<<"$(docker service ps --no-trunc --format '{{.CurrentState}}' "$service_id")"
then
  echo "No $target service is running"
  docker service logs "$service_id" --tail 50 2>&1 | sort -s -k 1,1
  exit 1

elif grep -qs "Failed" <<<"$(docker service ps --no-trunc --format '{{.CurrentState}}' "$service_id")"
then
  echo "The $target service has crashed"
  docker service logs "$service_id" --tail 50 2>&1 | sort -s -k 1,1
  exit 1

else
  echo "The $target service looks healthy"
  docker service logs "$service_id" --tail 50 2>&1 | sort -s -k 1,1
fi
