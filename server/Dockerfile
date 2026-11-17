FROM node:22-slim
WORKDIR /srv
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev
ENV NODE_ENV=production PORT=8787
EXPOSE 8787
CMD ["node", "dist/index.js"]
