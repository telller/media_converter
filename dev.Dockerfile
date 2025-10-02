###################
# BUILD FOR LOCAL DEV
###################

FROM node:21-slim AS dev

RUN apt-get update
RUN apt-get install -y libheif-examples libde265-0 libaom3 && rm -rf /var/lib/apt/lists/*

WORKDIR /src

COPY package*.json ./

RUN npm install

WORKDIR /src/dev

CMD [ "npm", "run", "start:dev" ]