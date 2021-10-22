FROM node:12.22.7-alpine3.11
WORKDIR /root
ENV HOME /root
ENV PATH $PATH:./node_modules/.bin:/root/node_modules/.bin
RUN apk add --update --no-cache bash curl g++ gcc git jq make openssl python3
RUN apk add --no-cache --repository="http://dl-cdn.alpinelinux.org/alpine/v3.8/main" --repository="http://dl-cdn.alpinelinux.org/alpine/v3.8/community" pdftk
RUN npm config set unsafe-perm true && npm install -g npm@8.0.0
RUN npm install -g lerna@4.0.0
RUN curl https://raw.githubusercontent.com/vishnubob/wait-for-it/ed77b63706ea721766a62ff22d3a251d8b4a6a30/wait-for-it.sh > /bin/wait-for && chmod +x /bin/wait-for

COPY test.sh /test.sh
COPY entry.sh /entry.sh

ENTRYPOINT ["bash", "/entry.sh"]
