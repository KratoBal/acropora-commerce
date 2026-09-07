# A KIRAKAT KEPE.
#
# === A TELEPITES A GYOKERBOL MEGY, ES EZ MERT DONTES ===
#
# A ket alkalmazas KET KULONBOZO React fovezriot igenyel (a hatter admin-ja
# 18-ast, mert a Medusa 2.19 iranyitopultja az; a kirakat 19-est, Next 15.5).
# Az npm hoisting ezt nem tudta szetvalasztani: a `next` es a `@headlessui` a
# gyokeri 18-ast latta, a lap kodja a sajat 19-est, es a build a
# lap-generalasnal elhasalt (React error #31).
#
# A pnpm izolalt `node_modules`-a szerkezetileg megoldja. Merve 2026-09-07,
# feloldas-mereesel:
#
#     next            -> react 19.0.5
#     @headlessui     -> react 19.0.5
#     a kirakat kodja -> react 19.0.5
#     a hatter        -> react 18.3.1
#
# === MIERT NEM `pnpm deploy` A RUNNER SZAKASZBAN ===
#
# A kezenfekvo alak az lenne, hogy a runner egy onallo, `pnpm deploy`-jal
# eloallitott konyvtarat kap. Ket dolgot mertem meg, es mind a ketto ellene
# szol MA:
#
#   `pnpm deploy`            -> ERR_PNPM_DEPLOY_NONINJECTED_WORKSPACE
#                               (`inject-workspace-packages=true` kellene, ami
#                               a TELJES munkaterulet telepiteset megvaltoztatja)
#   `pnpm deploy --legacy`   -> kilepesi kod 243, es a kimenetben a
#                               `node_modules/react` SZIMBOLIKUS LINK marad,
#                               tehat nem onallo
#
# Ezert a runner a TELJES `/app` fat kapja meg: a gyokeri `node_modules` (benne
# a `.pnpm` tarolo) es a kirakat konyvtara egyutt. Nagyobb kep, cserebe a
# szimbolikus linkek feloldodnak. Merve: ebbol a fa-alakbol indulva a szerver a
# `/hu` es az ekezetes kategoria-lapon egyarant HTTP 200-at ad.

FROM node:22-bookworm-slim AS builder

WORKDIR /app

# A `corepack` a node:22 kepben benne van, tehat nem kell kulon telepites.
RUN corepack enable && corepack prepare pnpm@10.34.5 --activate

# MIND A KET workspace package.json fajlja kell: a `--frozen-lockfile` a
# lockfile-t a TELJES munkateruleteel veti ossze, es egy hianyzo workspace-nel
# megtagadja a telepitest.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json .npmrc ./
COPY apps/backend/package.json ./apps/backend/package.json
COPY apps/storefront/package.json ./apps/storefront/package.json

# `--filter @dtc/storefront...`: csak a kirakat es a fuggosegei telepulnek.
# A harom pont a szuro resze, nem elgepeles.
RUN pnpm install --frozen-lockfile --filter "@dtc/storefront..."

COPY . .

# A `next build` a Store API-t MAR BUILD IDOBEN hivja: harom oldal
# (kategoria, termek, gyujtemeny) `generateStaticParams` fuggvenye lekerdezi a
# katalogust. Ezert ezek EPITESI feltetelek, nem futasideju beallitasok -- a
# kulcs nelkul a build a kategoria-oldalnal all meg, 400-as valasszal.
ARG NEXT_PUBLIC_MEDUSA_BACKEND_URL
ARG NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_DEFAULT_REGION=hu
ARG NEXT_PUBLIC_BASE_URL
ENV NEXT_PUBLIC_MEDUSA_BACKEND_URL=$NEXT_PUBLIC_MEDUSA_BACKEND_URL
ENV NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=$NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_DEFAULT_REGION=$NEXT_PUBLIC_DEFAULT_REGION
ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL

RUN pnpm --filter @dtc/storefront build


FROM node:22-bookworm-slim AS runner

ENV NODE_ENV=production

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.34.5 --activate

# A TELJES fa, a fenti indoklas szerint: a gyokeri `node_modules` a `.pnpm`
# tarolóval egyutt, es a kirakat konyvtara. A hatter forrasa NEM kell.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /app/apps/storefront ./apps/storefront

WORKDIR /app/apps/storefront

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
# meg. A build argumentum NEM OROKLODIK szakaszok kozott, tehat abban a
# szakaszban kell deklaralni, amelyik OLVASSA.
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

CMD ["pnpm", "start"]
