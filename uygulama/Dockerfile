FROM node:22-alpine

WORKDIR /app

# Önce yalnızca bağımlılık listesi kopyalanır: kod değişince npm ci yeniden çalışmaz (katman önbelleği)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src

ENV NODE_ENV=production
EXPOSE 8000
CMD ["node", "src/app.js"]
