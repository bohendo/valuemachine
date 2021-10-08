FROM node:14.17.6-alpine3.14
WORKDIR /root
ENV HOME /root
ENV PATH $PATH:./node_modules/.bin:/root/node_modules/.bin
RUN apk add --update --no-cache bash curl g++ gcc git jq make openssl
RUN curl https://raw.githubusercontent.com/vishnubob/wait-for-it/ed77b63706ea721766a62ff22d3a251d8b4a6a30/wait-for-it.sh > /bin/wait-for && chmod +x /bin/wait-for
RUN npm config set unsafe-perm true && npm install -g npm@8.0.0
RUN npm install -g lerna@4.0.0

COPY test.sh /test.sh
COPY entry.sh /entry.sh

ENTRYPOINT ["bash", "/entry.sh"]
