FROM node:12.16.1-alpine3.11
WORKDIR /root
ENV HOME /root
RUN apk add --update --no-cache bash curl git jq make py-pip python 
RUN apk add --no-cache --repository="http://dl-cdn.alpinelinux.org/alpine/v3.8/main" --repository="http://dl-cdn.alpinelinux.org/alpine/v3.8/community" pdftk
RUN npm config set unsafe-perm true
RUN pip install --upgrade pip fdfgen
RUN npm install --global npm@6.14.5
RUN npm install -g lerna@3.20.2
COPY entry.sh /entry.sh
ENV PATH="./node_modules/.bin:${PATH}"
ENTRYPOINT ["bash", "/entry.sh"]
