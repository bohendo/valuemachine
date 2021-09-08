#!/bin/bash
set -e

this_user="$(id -u):$(id -g)"
user="$1"
shift;
cmd="$*"

finish() {
  if [[ "$this_user" != "$user" ]]
  then chown -R "$user" /root #&& echo "Fixing permissions for $user"
  #else echo "Same user, skipping permission fix"
  fi
}
trap finish EXIT SIGINT

#echo "Running command as $this_user (target user: $user)"
bash -c "$cmd"
