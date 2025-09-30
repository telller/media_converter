###################
# BUILD FOR LOCAL DEV
###################

FROM node:21-alpine AS dev

WORKDIR /src

COPY package*.json ./

RUN npm install

COPY . .

USER node

WORKDIR /src/dev

CMD ["npm", "run", "start:dev"]