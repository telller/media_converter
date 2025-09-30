###################
# DEV BUILD
###################

FROM node:21-bullseye

# Робоча директорія всередині контейнера
WORKDIR /src/dev

# Копіюємо лише package.json для npm install
COPY package*.json ./

# Встановлюємо залежності під root (щоб не було проблем з правами)
RUN npm install

# Копіюємо весь код
COPY . .

# Створюємо папку dist всередині контейнера і даємо права teller
RUN mkdir -p /src/dev/dist \
    && groupadd -g 1000 teller \
    && useradd -u 1000 -g 1000 -m teller \
    && chown -R teller:teller /src/dev/dist

# Перемикаємось на користувача teller
USER 1000:1000

# Робоча директорія для запуску
WORKDIR /src/dev

# Команда для запуску NestJS у watch-mode
CMD ["npm", "run", "start:dev"]
