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

# @medusajs/js-sdk and @medusajs/types 2.23 need node >=22.22.0 (their engines). `node:22-bookworm-slim` is a moving tag, and a builder with an old
# cached copy of it would build on an older 22.x without a word: pnpm only warns on an engines mismatch. This line stops the build instead, and prints
# the version into the build log either way. The runner uses the same tag in the same build.
RUN node -e "const [a,b]=process.versions.node.split('.').map(Number); console.log('node', process.version); if (a<22||(a===22&&b<22)) { console.error('node >=22.22.0 is required (Medusa 2.23 packages)'); process.exit(1) }"

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
# A Fogyasztobarat kapcsoloja (2026-10-05): ALAPBOL KI, csak az eles atallaskor `true`.
# A NEXT_PUBLIC_* ertek a buildbe eg: a bekapcsolas uj buildet ker.
ARG NEXT_PUBLIC_FOGYASZTOBARAT_ENABLED=false
ARG NEXT_PUBLIC_FOGYASZTOBARAT_ID=JPNFMVH0
ENV NEXT_PUBLIC_FOGYASZTOBARAT_ENABLED=$NEXT_PUBLIC_FOGYASZTOBARAT_ENABLED
ENV NEXT_PUBLIC_FOGYASZTOBARAT_ID=$NEXT_PUBLIC_FOGYASZTOBARAT_ID
# A jogi kapu teszt-modja (2026-11-02): ALAPBOL URES (= enforce). Csak a teszt
# kirakat allitja `test`-re; minden mas cimen (az eles is) a kod maga enforce-ra esik. Az eles
# atallaskor a valtozot TOROLNI kell. A buildbe eg: a valtas uj buildet ker.
ARG NEXT_PUBLIC_LEGAL_GATE_MODE=
ENV NEXT_PUBLIC_LEGAL_GATE_MODE=$NEXT_PUBLIC_LEGAL_GATE_MODE
# A "Szólj, ha jön hasonló" urlap (V2.4, 0c1265d2): ALAPBOL URES (= nincs urlap). Csak a teszt
# kirakat allitja `on`-ra, parban a bolt ACROPORA_STOCK_ALERT kapcsolojaval; a hozzajarulas es a
# level szovege jovahagyasra var. A buildbe eg: a valtas uj buildet ker.
ARG NEXT_PUBLIC_STOCK_ALERT=
ENV NEXT_PUBLIC_STOCK_ALERT=$NEXT_PUBLIC_STOCK_ALERT
# A Stripe PUBLIKUS kulcsa a kartyamezonek (`src/lib/util/stripe-kulcs.ts`): NEM titok, de a `next build` egeti a kliens-kodba (a
# kartyamezo csak a fizetesi oldal darabjaban van), ARG nelkul a build nem latja akkor sem, ha a Coolify --build-arg-kent atadja.
# ALAPBOL URES (= a kartyas mod nem jelenik meg, mint eddig). Csak ebben a szakaszban kell: a futasideju szakasz csak a `next.config.js`
# ellenorzesenek valtozoit olvassa, a kulcsot nem, es az ertek mar a buildben benne van. A teszt kirakaton `pk_test_`, eleshez `pk_live_`.
ARG NEXT_PUBLIC_STRIPE_KEY=
ENV NEXT_PUBLIC_STRIPE_KEY=$NEXT_PUBLIC_STRIPE_KEY

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
