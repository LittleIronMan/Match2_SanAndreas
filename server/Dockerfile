FROM node:12-alpine AS build
WORKDIR /usr/src/app
# Installing dependencies first can save time on rebuilds
# We do need the full (dev) dependencies here
COPY package.json package-lock.json ./
RUN apk add --update \
    #python \
    #python-dev \
    #py-pip \
    #build-base \
    git
    #openssh-client \
RUN npm install
# Then copy in the actual sources we need and build
COPY tsconfig.json ./
COPY server_src ./server_src/
RUN npm run tsc

FROM node:12-alpine AS deps
WORKDIR /usr/src/app
# This _only_ builds a runtime node_modules tree.
# We won't need the package.json to actually run the application.
# If you needed developer-oriented tools to do this install they'd
# be isolated to this stage.
COPY package.json package-lock.json ./
RUN npm ci --only=production

FROM node:12-alpine
WORKDIR /usr/src/app
COPY --from=deps /usr/src/app/node_modules ./node_modules/
COPY --from=build /usr/src/app/build ./build/