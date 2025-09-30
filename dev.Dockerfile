###################
# BUILD FOR LOCAL DEV
###################

FROM node:21-alpine AS dev

WORKDIR /src

COPY package*.json ./

RUN npm install

COPY . .

RUN rm -rf /src/dev/dist

USER node

WORKDIR /src/dev

CMD ["npm", "run", "start:dev"]