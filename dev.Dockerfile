###################
# BUILD FOR LOCAL DEV
###################

FROM node:21-alpine AS dev

WORKDIR /src/dev

COPY package*.json ./

RUN npm install

COPY --chown=node:node . .

WORKDIR /src/dev

USER node

CMD [ "npm", "run", "start:dev" ]