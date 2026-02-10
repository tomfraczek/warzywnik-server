FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY dist ./dist
COPY migrations ./migrations

ENV NODE_ENV=staging
ENV PORT=4000

EXPOSE 4000

CMD ["node", "dist/main.js"]
