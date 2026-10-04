FROM node:22-alpine
WORKDIR /app
COPY package.json ./
COPY server.js render.js ./
COPY public ./public
ENV NODE_ENV=production PORT=3000
VOLUME /app/data
EXPOSE 3000
CMD ["node", "server.js"]
