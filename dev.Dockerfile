###################
# BUILD FOR LOCAL DEV
###################

FROM node:21-alpine AS dev

WORKDIR /src

COPY package*.json ./

RUN npm install

COPY . .

# Створюємо dist і даємо права teller
RUN mkdir -p /src/dev/dist && chown -R 1000:1000 /src/dev/dist

# Перемикаємось на користувача teller
USER 1000:1000

WORKDIR /src/dev

CMD ["npm", "run", "start:dev"]