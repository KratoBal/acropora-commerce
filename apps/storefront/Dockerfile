# A KIRAKAT KEPE.
#
# ============================================================================
# EZ A KEP MA IDEIGLENES, ES ITT ALL A LEJARATA
# ============================================================================
#
# MA: a kep a BEOLVASZTATLAN agrol epul (feat/storefront-from-dtc-starter),
# pinneles NELKUL, azert, hogy Balazs lassa a kirakatot egy cimen. A CI Build
# lepese a gyokerbol futo `turbo build`-del a kirakatot is epiti, es ott a ket
# React utkozese miatt ma elhasal -- tehat az ag nem olvaszthato be.
#
# A LEJARAT: a repo atallitasa pnpm-re. A pnpm izolalt `node_modules`-a a ket
# React utkozeset szerkezetileg megszunteti, es akkor
#   - a kep a FO AGROL epul,
#   - a fuggosegek a repo lockfile-jabol jonnek, tehat pinnelve lesznek,
#   - es EZ A BLOKK TORLENDO.
#
# MIERT ALL ITT EZ A HAROM SOR: egy ideiglenes megoldas, aminek nincs kimondva
# a vege, allando lesz. (acrobot kikotese, 2026-09-07)
#
# ES MIERT NINCS SAJAT LOCKFILE HELYETTE: egy masodik lockfile a repoban
# ugyanaz a szag, amitol a kirakat kiemeleset elvetettuk -- utana ki kellene
# vezetni, es a kivezetes az, ami elmarad. A pinneles hianyat inkabb VISELJUK
# es LEIRJUK. Az ara most alacsony: egy TESZT gepi kep, amit napokban merunk,
# nem honapokban.
# ============================================================================
#
# === MIERT KULON DOCKERFILE, ES MIERT A KIRAKAT KONYVTARABAN ===
#
# A repo gyokerében allo Dockerfile CSAK a hatteret epiti (`npx medusa build`,
# 9000-es port), es a compose negy szolgaltatasa kozott sincs kirakat. Vagyis a
# kirakatnak ma NINCS telepitesi utja: beolvasztas utan sehol nem futna -- nem
# hibaval, hanem ugy, hogy nincs hova telepiteni.
#
# === A TELEPITES A KIRAKAT KONYVTARABAN TORTENIK, ES EZ MERT DONTES ===
#
# A gyokerbol futo `npm ci` a KET alkalmazas fuggosegeit egy fara teszi, es a
# ketto KET KULONBOZO React fovezriot igenyel: a hatter admin-kiterjesztese
# 18-ast (a Medusa 2.19 iranyitopultja az), a kirakat 19-est (Next 15.5).
# Merve 2026-09-07, feloldas-meressel, nem a hibauzenetbol:
#
#     next          -> react 18.3.1   (a gyokerbol)
#     @headlessui   -> react 18.3.1
#     a kirakat kodja -> react 19.0.5 (a sajat node_modules-abol)
#
# Ket React egyszerre, es a 19-es nem fogadja el a 18-as elemeit: a `next build`
# a lap-generalasnal elhasal (React error #31).
#
# Ha viszont a telepites EBBEN a konyvtarban tortenik, mindketto 19.0.5-ot lat.
# Merve ugyanaznap: 533 csomag, kilepesi kod 0, 244 statikus lap, nulla hiba.
#
# === AMIT EZ AR, ES AMIT NEM OLD MEG ===
#
# NINCS lockfile ehhez a telepiteshez, tehat a verziok nincsenek pinnelve: ket
# honap mulva ugyanez a fajl mas verziokat huzhat be, CSENDBEN. Ezt vagy egy
# sajat lockfile oldja fel (masodik lockfile a repoban), vagy az, ha a repo
# egesze pnpm-re all -- ott az izolacio szerkezeti, es akkor ennek a fajlnak
# CSAK a telepito sorai valtoznak.
#
# ES AMIT EZ NEM CSINAL: nem veszi ki a kirakatot a workspace-bol. A gyokerbol
# futo `turbo build` tovabbra is epiti, tehat a CI kapuja megmarad -- es ma
# tovabbra is elhasal rajta. Ez a fajl a TELEPITEST oldja meg, nem a kaput.

FROM node:22-bookworm-slim AS builder

WORKDIR /app

COPY package.json ./
RUN npm install --no-audit --no-fund

COPY . .

# A `next build` a Store API-t MAR BUILD IDOBEN hivja: harom oldal
# (kategoria, termek, gyujtemeny) `generateStaticParams` fuggvenye lekerdezi a
# katalogust. Ezert a ket valtozo nem futasideju, hanem EPITESI feltetel -- a
# kulcs nelkul a build a kategoria-oldalnal all meg, 400-as valasszal.
ARG NEXT_PUBLIC_MEDUSA_BACKEND_URL
ARG NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_DEFAULT_REGION=hu
ARG NEXT_PUBLIC_BASE_URL
ENV NEXT_PUBLIC_MEDUSA_BACKEND_URL=$NEXT_PUBLIC_MEDUSA_BACKEND_URL
ENV NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=$NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_DEFAULT_REGION=$NEXT_PUBLIC_DEFAULT_REGION
ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL

RUN npm run build


FROM node:22-bookworm-slim AS runner

ENV NODE_ENV=production

WORKDIR /app

# A `next start` harom dolgot igenyel: a lefordított kimenetet, a fuggosegeket
# es a statikus fajlokat. A `public` konyvtar kulon all, mert a `.next` nem
# tartalmazza.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.js ./next.config.js
COPY --from=builder /app/check-env-variables.js ./check-env-variables.js

# A NEGY VALTOZO A RUNNER SZAKASZBAN IS KELL, ES EZ MERT HIBA VOLT.
#
# A `next start` betolti a `next.config.js` fajlt, az pedig meghivja a
# `check-env-variables` fuggvenyt -- FUTASIDOBEN is, nem csak epiteskor.
# Merve 2026-09-07 a kesz buildon, a kulcsot kivéve a kornyezetbol:
#
#     next start  ->  KILEPESI KOD 1
#     "Error: Missing required environment variables:
#      NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY"
#
# Vagyis a kep SIKERESEN felepult volna, es a kontener INDULASKOR halt volna
# meg. Ez ugyanaz a szabaly, amit a `GIT_SHA` blokk lentebb mar kimond, es amit
# a hatter Dockerfile-ja is: a build argumentum NEM OROKLODIK szakaszok kozott,
# tehat abban a szakaszban kell deklaralni, amelyik OLVASSA.
ARG NEXT_PUBLIC_MEDUSA_BACKEND_URL
ARG NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_DEFAULT_REGION=hu
ARG NEXT_PUBLIC_BASE_URL
ENV NEXT_PUBLIC_MEDUSA_BACKEND_URL=$NEXT_PUBLIC_MEDUSA_BACKEND_URL
ENV NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=$NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_DEFAULT_REGION=$NEXT_PUBLIC_DEFAULT_REGION
ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL

EXPOSE 8000

# Ugyanaz a ket fuggetlen ut, mint a hatter kepenel: a cimke akkor is
# olvashato, ha a kontener nem fut, a kornyezeti valtozo akkor is, ha valaki a
# kepet atcimkezte. Az alapertek szandekosan "unknown" es nem ures.
ARG GIT_SHA=unknown
ENV APP_GIT_SHA=$GIT_SHA
LABEL org.opencontainers.image.revision=$GIT_SHA
LABEL org.opencontainers.image.source=https://github.com/KratoBal/acropora-commerce

# A node:22-bookworm-slim kepben nincs curl es nincs wget, ezert az ellenorzes
# a node beepitett halozati hivasaval megy -- ugyanaz a megoldas, mint a hatter
# kepeben.
#
# A `/hu` cimet kerdezi, nem a gyokeret: a gyoker 307-tel atiranyit, es egy
# atiranyitas is "ok"-nak szamit, tehat kevesebbet bizonyitana. Amit ez az
# ellenorzes BIZONYIT: a kiszolgalo fut ES ki tud szolgalni egy olyan lapot,
# ami a Store API-tol kap adatot. Amit NEM: hogy a katalogus teljes.
HEALTHCHECK --interval=10s --timeout=10s --start-period=30s --retries=5 \
  CMD ["node","-e","fetch('http://127.0.0.1:8000/hu').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]

CMD ["npm", "run", "start"]
