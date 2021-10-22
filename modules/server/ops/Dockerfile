FROM node:12.16.1-alpine3.11
WORKDIR /root
ENV HOME /root
ENV PATH $PATH:./node_modules/.bin:/root/node_modules/.bin
RUN apk add --update --no-cache bash curl git jq make py-pip python
RUN apk add --no-cache --repository="http://dl-cdn.alpinelinux.org/alpine/v3.8/main" --repository="http://dl-cdn.alpinelinux.org/alpine/v3.8/community" pdftk
RUN npm config set unsafe-perm true
RUN npm install -g npm@8.0.0
RUN npm install pino-pretty@7.0.1 --no-save --no-package-lock
RUN pip install --upgrade pip fdfgen
RUN curl https://raw.githubusercontent.com/vishnubob/wait-for-it/ed77b63706ea721766a62ff22d3a251d8b4a6a30/wait-for-it.sh > /bin/wait-for && chmod +x /bin/wait-for
COPY ops ops
COPY dist dist
COPY dist/docs node_modules/@valuemachine/taxes/docs
COPY dist/ops node_modules/@valuemachine/taxes/ops

ENTRYPOINT ["bash", "ops/entry.sh"]
