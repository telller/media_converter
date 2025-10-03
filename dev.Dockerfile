###################
# BUILD FOR LOCAL DEV
###################

FROM node:21-slim AS dev

RUN apt-get update
RUN apt-get install -y --no-install-recommends curl gnupg ca-certificates lsb-release findutils
RUN rm -rf /var/lib/apt/lists/*
RUN echo "deb http://deb.debian.org/debian bookworm-backports main" >> /etc/apt/sources.list
RUN apt-get update
RUN apt-get -t bookworm-backports install -y --no-install-recommends libheif-examples libde265-0 libaom3 findutils
RUN rm -rf /var/lib/apt/lists/*

WORKDIR /src

COPY package*.json ./

RUN npm install

WORKDIR /src/dev

CMD [ "npm", "run", "start:dev" ]