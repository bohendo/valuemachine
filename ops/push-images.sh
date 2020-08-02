#!/usr/bin/env bash
set -e

root="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." >/dev/null 2>&1 && pwd )"
project="`cat $root/package.json | grep '"name":' | head -n 1 | cut -d '"' -f 4`"
registryRoot="`cat $root/package.json | grep '"registry":' | head -n 1 | cut -d '"' -f 4`"
organization="${CI_PROJECT_NAMESPACE:-`whoami`}"
commit=`git rev-parse HEAD | head -c 8`
version="$1"

registry="$registryRoot/$organization/$project"

for image in builder proxy server webserver
do
  image=${project}_$image
  echo;echo "Pushing $registry/$image:$version"
  docker tag $image:$commit $registry/$image:$version
  docker push $registry/$image:$version
  # latest images are used as cache for build steps, keep them up-to-date
  docker tag $image:$commit $registry/$image:latest
  docker push $registry/$image:latest
done
