FROM node:16

MAINTAINER keith.dh@hotmail.com

EXPOSE 5000

WORKDIR /home/node/app

COPY ./build /home/node/app

RUN npm config set registry https://registry.npmmirror.com
RUN npm install
RUN npm run build

CMD node index.js
