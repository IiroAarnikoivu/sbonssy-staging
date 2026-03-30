FROM node:20.19.1
WORKDIR /var/www/html/sbonssy
ARG ENVFILE
USER root
COPY ./ ./
COPY $ENVFILE ./.env
COPY ./package.json /.
RUN yarn install && yarn build
CMD ["npm", "start"]

