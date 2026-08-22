FROM node:22-bookworm-slim AS builder

WORKDIR /app

COPY package.json package-lock.json turbo.json ./
COPY apps/backend/package.json ./apps/backend/package.json

RUN npm ci

COPY . .

WORKDIR /app/apps/backend

RUN npx medusa build


FROM node:22-bookworm-slim AS runner

ENV NODE_ENV=production

WORKDIR /app

COPY --from=builder /app/apps/backend/.medusa/server ./

RUN npm install --omit=dev

EXPOSE 9000

CMD ["npx", "medusa", "start", "--host", "0.0.0.0", "--port", "9000"]
