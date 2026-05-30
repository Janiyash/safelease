FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN mkdir -p uploads
EXPOSE 5000
CMD ["npx", "ts-node", "src/server.ts"]
