###################
# BUILD FOR LOCAL DEV
###################

FROM node:21-alpine AS dev

WORKDIR /src

COPY package*.json ./

RUN npm install

COPY . .

RUN adduser -D -u 1000 -h /home/teller -s /bin/sh teller && chown -R teller:teller /src

USER 1000:1000

WORKDIR /src/dev

CMD ["npm", "run", "start:dev"]