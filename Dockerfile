FROM node:22-alpine
WORKDIR /app
COPY . .
RUN npm ci && npm run build
ENV NODE_ENV=production PORT=3001
EXPOSE 3001
CMD ["node", "server/index.js"]
