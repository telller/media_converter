###################
# BUILD FOR LOCAL DEV
###################

FROM node:21-alpine AS dev

# Встановлюємо системні залежності для sharp + HEIC
RUN apk add --no-cache vips-dev libheif libde265 aom-dev build-base python3

WORKDIR /src

COPY package*.json ./

RUN npm install

WORKDIR /src/dev

CMD [ "npm", "run", "start:dev" ]