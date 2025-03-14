FROM node:18-alpine AS build

RUN apk update
RUN apk upgrade
RUN apk add --no-cache ffmpeg

WORKDIR /usr/src/app

COPY --chown=node:node package*.json ./

RUN npm ci

COPY --chown=node:node . .

# Set NODE_ENV environment variable
ENV NODE_ENV production

# Run the build command which creates the production bundle
RUN npm run build

# Running `npm ci` removes the existing node_modules directory and passing in --only=production ensures that only the production dependencies are installed.
# This ensures that the node_modules directory is as optimized as possible
RUN npm ci --only=production && npm cache clean --force

USER node

###################
# PRODUCTION
###################

FROM node:18-alpine AS prod

RUN apk update
RUN apk upgrade
RUN apk add --no-cache ffmpeg

# Copy the bundled code from the build stage to the production image
COPY --chown=node:node --from=build /usr/src/app/node_modules ./node_modules
COPY --chown=node:node --from=build /usr/src/app/dist ./dist

USER node

# Start the server using the production build
CMD [ "node", "dist/main.js" ]
