FROM node:22-bookworm

WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .

EXPOSE 4000

CMD ["node", "./src/index.js"]