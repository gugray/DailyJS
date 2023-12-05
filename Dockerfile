FROM node:20-alpine AS build

COPY ./DailyJS /app/
WORKDIR app
RUN npm install
RUN npm run gulp
RUN npm prune --production
RUN rm -rf public/dev-*

FROM node:20-alpine
COPY --from=build /app /app/
WORKDIR app

ENTRYPOINT [ "node", "server.js" ]


