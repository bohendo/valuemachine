FROM node:12.16.1-alpine3.11
WORKDIR /root
ENV HOME /root
RUN apk add --update --no-cache bash curl git jq make openssl py-pip python 
RUN apk add --no-cache --repository="http://dl-cdn.alpinelinux.org/alpine/v3.8/main" --repository="http://dl-cdn.alpinelinux.org/alpine/v3.8/community" pdftk
RUN npm config set unsafe-perm true
RUN npm install -g npm@7.23.0
RUN pip install --upgrade pip fdfgen
RUN curl https://raw.githubusercontent.com/vishnubob/wait-for-it/ed77b63706ea721766a62ff22d3a251d8b4a6a30/wait-for-it.sh > /bin/wait-for && chmod +x /bin/wait-for
COPY ops ops
COPY dist dist

ENTRYPOINT ["bash", "ops/entry.sh"]
