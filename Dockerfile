FROM node:lts AS BUILDER
WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run lint && npm run build

FROM node:lts-alpine
WORKDIR /usr/src/app
COPY k8up_to_kuma.config.json ./
COPY package*.json ./
RUN npm install --only=production
COPY --from=builder /usr/src/app/dist ./
EXPOSE 3000
ENV K8UP_TO_KUMA_HOST=0.0.0.0
ENTRYPOINT ["node","./app.js"]