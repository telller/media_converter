###################
# BUILD FOR LOCAL DEV
###################

FROM node:21-alpine AS dev

WORKDIR /src

COPY package*.json ./

CMD [ "npm", "install" ]

WORKDIR /src/dev

CMD [ "npm", "run", "start:dev" ]