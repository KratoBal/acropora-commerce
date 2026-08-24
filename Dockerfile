FROM node:22-bookworm-slim AS builder

WORKDIR /app

COPY package.json package-lock.json turbo.json ./
COPY apps/backend/package.json ./apps/backend/package.json

RUN npm ci

COPY . .

WORKDIR /app/apps/backend

RUN npx medusa build

# A builder szakasz szandekosan NEM deklaralja a GIT_SHA argumentumot: nem
# hasznalja az erteket, tehat ott a deklaracio nem csinalna semmit. A "mindket
# szakaszban kulon kell" szabaly igaz, de csak arra a szakaszra, amelyik
# tenylegesen OLVASSA az erteket, mert a build argumentum nem oroklodik.
# Itt ez a runner.


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

# A Coolify a konteneren BELULROL ellenorzi az egeszseget, curl vagy wget
# paranccsal, es a node:22-bookworm-slim kepben egyik sincs. Ezert a kep sajat
# ellenorzest hoz, a node beepitett halozati hivasaval: igy nem kell csomagot
# telepiteni a futtato retegbe.
#
# Az indulasi turelem 60 masodperc, mert a mai naplo szerint az indulas 2,5
# masodperc, de az ELSO indulas migracioval ennel hosszabb lehet.
#
# Amit ez az ellenorzes BIZONYIT: a HTTP kiszolgalo fut es valaszol. Amit NEM:
# hogy a rendszer mukodik. A /health utvonal a Medusa sajat megjegyzese szerint
# is statikus valasz, tehat egy futas kozben elveszett adatbazis mellett is
# zold marad. Az indulasi hibat viszont megfogja, mert akkor kiszolgalo sincs.
HEALTHCHECK --interval=10s --timeout=5s --start-period=60s --retries=5 \
  CMD ["node","-e","fetch('http://127.0.0.1:9000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]

CMD ["npx", "medusa", "start", "--host", "0.0.0.0", "--port", "9000"]
