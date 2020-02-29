FROM alpine:3.8
WORKDIR /root
ENV HOME /root
RUN apk add --update --no-cache bash curl git jq make
RUN apk add --update --no-cache nodejs npm pdftk python py-pip
RUN apk add npm
RUN npm config set unsafe-perm true
RUN npm install --global npm@6.14.1
RUN pip install --upgrade pip fdfgen
COPY ops /ops
ENV PATH="./node_modules/.bin:${PATH}"
ENTRYPOINT ["bash", "/ops/permissions-fixer.sh"]
