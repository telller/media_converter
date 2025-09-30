###################
# BUILD FOR LOCAL DEV
###################

FROM node:21-alpine AS dev

WORKDIR /src

COPY package*.json ./

CMD [ "npm", "install" ]

WORKDIR /src/dev

RUN useradd -u 1000 -m teller
RUN chown -R teller:teller /src
USER 1000:1000

CMD [ "npm", "run", "start:dev" ]