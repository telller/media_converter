###################
# DEV BUILD (Alpine)
###################

FROM node:21-alpine AS dev

WORKDIR /src/dev

COPY package*.json ./

RUN npm install

COPY . .

RUN mkdir -p /src/dev/dist && chown -R node:node /src/dev/dist

USER node

WORKDIR /src/dev

CMD ["npm", "run", "start:dev"]
