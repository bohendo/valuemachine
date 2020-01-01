FROM alpine:3.8
WORKDIR /root
ENV HOME /root
RUN apk add --update --no-cache bash curl git jq make
RUN apk add --update --no-cache nodejs pdftk python py-pip
RUN apk add npm
#RUN apk add --update --no-cache g++ gcc
RUN npm config set unsafe-perm true
RUN npm install -g npm@6.12.0
RUN pip install fdfgen
COPY ops /ops
ENV PATH="./node_modules/.bin:${PATH}"
ENTRYPOINT ["bash", "/ops/permissions-fixer.sh"]
