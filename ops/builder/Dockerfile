FROM node:14.15.4-alpine3.12
WORKDIR /root
ENV HOME /root
ENV PATH ./node_modules/.bin:/root/node_modules/.bin:$PATH
RUN apk add --update --no-cache bash curl g++ gcc git jq make openssl py-pip python3
RUN apk add --no-cache --repository="http://dl-cdn.alpinelinux.org/alpine/v3.8/main" --repository="http://dl-cdn.alpinelinux.org/alpine/v3.8/community" pdftk
RUN curl https://raw.githubusercontent.com/vishnubob/wait-for-it/ed77b63706ea721766a62ff22d3a251d8b4a6a30/wait-for-it.sh > /bin/wait-for && chmod +x /bin/wait-for
RUN pip install --upgrade pip fdfgen
RUN npm config set unsafe-perm true && npm install -g npm@7.23.0
RUN npm install -g lerna@4.0.0

COPY test.sh /test.sh
COPY entry.sh /entry.sh

ENTRYPOINT ["bash", "/entry.sh"]
