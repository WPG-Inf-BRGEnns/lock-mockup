# Betrieb des Lock-Mockups als "Geraet" im Labornetz.
FROM node:24-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

ENV LOCK_HOST=0.0.0.0 \
    LOCK_PORT=8080
EXPOSE 8080
USER node
CMD ["node", "src/server.js"]
