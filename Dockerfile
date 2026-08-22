FROM node:22-bookworm-slim AS builder

WORKDIR /app

COPY package.json package-lock.json turbo.json ./
COPY apps/backend/package.json ./apps/backend/package.json

RUN npm ci

COPY . .

WORKDIR /app/apps/backend

RUN npx medusa build

# A build argumentum nem oroklodik szakaszok kozott, ezert mindket szakaszban
# kulon kell deklaralni. Itt szandekosan a draga lepesek UTAN all: egy ARG a
# deklaraciojatol kezdve elavultta teszi a gyorsitotarat, es a commit minden
# telepitesnel mas, tehat feljebb minden buildnel ujra futna az npm ci.
ARG GIT_SHA=unknown


FROM node:22-bookworm-slim AS runner

ENV NODE_ENV=production

WORKDIR /app

COPY --from=builder /app/apps/backend/.medusa/server ./

RUN npm install --omit=dev

EXPOSE 9000

# Ugyanaz a szam ket fuggetlen uton. A cimke akkor is olvashato, ha a kontener
# nem fut (docker inspect), a kornyezeti valtozo pedig akkor is, ha valaki a
# kepet atcimkezte (printenv APP_GIT_SHA a futo kontenerben).
#
# Az alapertek szandekosan "unknown" es nem ures: egy ures cimke ugy nez ki,
# mint a hianyzo cimke, az "unknown" viszont kimondja, hogy ezt a kepet nem a
# telepito szkript epitette.
#
# A blokk a szakasz vegen all, hogy a commit valtozasa ne ervenytelenitse az
# npm install reteget.
ARG GIT_SHA=unknown
ENV APP_GIT_SHA=$GIT_SHA
LABEL org.opencontainers.image.revision=$GIT_SHA
LABEL org.opencontainers.image.source=https://github.com/KratoBal/acropora-commerce

CMD ["npx", "medusa", "start", "--host", "0.0.0.0", "--port", "9000"]
