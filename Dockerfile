FROM node:22-alpine AS build

WORKDIR /app

RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci
COPY . ./
RUN npx tsc

FROM node:22-alpine

WORKDIR /app

COPY --from=build /app/lib ./lib
COPY --from=build /app/node_modules ./node_modules

# Command to run the application
CMD ["node", "lib/main.js"]
