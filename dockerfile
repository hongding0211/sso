FROM node:16

MAINTAINER keith.dh@hotmail.com

WORKDIR /home/node/app

EXPOSE 3000

COPY / /

RUN npm i
RUN npm run build

CMD node build/index.js
