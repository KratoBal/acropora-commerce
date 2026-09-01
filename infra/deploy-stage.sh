#!/usr/bin/env bash
#
# A stage kep felepitese ugy, hogy vissza lehessen vezetni egy commitra.
#
# Amit csinal:
#   1. megtagadja a futast piszkos munkafan
#   2. megtagadja, ha a HEAD nem az origin/main feje
#   3. megall, ha a telepitendo commit uj migraciot hoz
#   4. epit GIT_SHA build argumentummal, CSAK a rovid azonositos cimkevel
#   5. visszaolvassa a kepbol a cimket es a kornyezeti valtozot
#   6. csak ezutan teszi ra a mozgo "stage" mutatot
#   7. kiirja a DEPLOYED.md fajlt
#
# Amit NEM csinal, szandekosan:
#   - nem futtat migraciot
#   - nem indit es nem allit le kontenert
#
# A kontenerek inditasa azert marad kivul, mert a docker-compose.yml NINCS a
# repoban. Amig a futtatas leirasa a hoston el, a szkript nem tudja
# reprodukalhatoan elvegezni, es a felig reprodukalhato telepites rosszabb,
# mint a bevallottan kezi lepes. A szkript a vegen kiirja a kovetkezo parancsot.
#
# Hasznalat:
#   bash infra/deploy-stage.sh
#   bash infra/deploy-stage.sh --allow-detached <sha>   # szandekos visszaallas
#
# set -e szandekosan NINCS egyedul: minden lepes utan kifejezett ellenorzes all,
# hogy a hiba ne csak megallitson, hanem meg is mondja, mi a baj.

set -uo pipefail

IMAGE_NAME="${IMAGE_NAME:-acropora-commerce-medusa}"
STAGE_TAG="${STAGE_TAG:-stage}"
REMOTE="${REMOTE:-origin}"
BRANCH="${BRANCH:-main}"

ALLOW_DETACHED=""

fail() {
  echo >&2
  echo "MEGTAGADVA: $*" >&2
  echo >&2
  exit 1
}

step() {
  echo
  echo "== $* =="
}

usage() {
  sed -n '2,30p' "$0" | sed 's/^# \{0,1\}//'
  exit 0
}

while [ $# -gt 0 ]; do
  case "$1" in
    --allow-detached)
      shift
      [ $# -gt 0 ] || fail "a --allow-detached utan meg kell adni egy commit azonositot"
      ALLOW_DETACHED="$1"
      ;;
    -h|--help)
      usage
      ;;
    *)
      fail "ismeretlen kapcsolo: $1"
      ;;
  esac
  shift
done

# ---------------------------------------------------------------------------
# 0. Hol vagyunk
# ---------------------------------------------------------------------------

step "0. A repo megkeresese"

command -v git >/dev/null 2>&1 || fail "nincs git a gepen"

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"
[ -n "$REPO_ROOT" ] || fail "ezt a szkriptet a repon belulrol kell futtatni"

cd "$REPO_ROOT" || fail "nem tudtam belepni a repo gyokerebe: $REPO_ROOT"
echo "repo: $REPO_ROOT"

DEPLOYED_FILE="${DEPLOYED_FILE:-$REPO_ROOT/DEPLOYED.md}"

# ---------------------------------------------------------------------------
# 1. Piszkos munkafa: ez a fo fek
# ---------------------------------------------------------------------------

step "1. A munkafa allapota"

# A --porcelain alapbol a NEM KOVETETT fajlokat is mutatja, es ez itt nem
# melleklet, hanem kovetelmeny: a Dockerfile "COPY . ." parancsa mindent
# bemasol, amit a .dockerignore nem zar ki, tehat egy odatevedt fajl beleepul a
# kepbe anelkul, hogy barhol nyoma lenne.
DIRTY="$(git status --porcelain)"

if [ -n "$DIRTY" ]; then
  echo "$DIRTY" >&2
  fail "a munkafa piszkos. Egy piszkos munkafabol epult kep nem vezetheto vissza egy commitra."
fi

echo "tiszta"

# ---------------------------------------------------------------------------
# 2. A HEAD legyen az, aminek lennie kell
# ---------------------------------------------------------------------------

step "2. A HEAD osszevetese a(z) $REMOTE/$BRANCH aggal"

git fetch "$REMOTE" "$BRANCH" >/dev/null 2>&1 \
  || fail "a 'git fetch $REMOTE $BRANCH' nem futott le. Halozat vagy hitelesites?"

# Mindenhol --verify --quiet, es nem a csupasz rev-parse. A csupasz alak hiba
# eseten VISSZAECHOZZA a bemenetet a kimenetre (es 128-cal lep ki), tehat egy
# nem letezo hivatkozas is nem-ures valaszt ad, es az "ures-e" ellenorzes atengedi.
HEAD_SHA="$(git rev-parse --verify --quiet HEAD)"
[ -n "$HEAD_SHA" ] || fail "nem tudtam megallapitani a HEAD azonositojat"

REMOTE_SHA="$(git rev-parse --verify --quiet "$REMOTE/$BRANCH")"
[ -n "$REMOTE_SHA" ] || fail "nem tudtam megallapitani a(z) $REMOTE/$BRANCH azonositojat"

if [ -n "$ALLOW_DETACHED" ]; then
  TARGET_SHA="$(git rev-parse --verify --quiet "$ALLOW_DETACHED^{commit}")"
  [ -n "$TARGET_SHA" ] || fail "a megadott commit nem letezik ebben a repoban: $ALLOW_DETACHED"

  [ "$HEAD_SHA" = "$TARGET_SHA" ] \
    || fail "a --allow-detached $ALLOW_DETACHED azonositot kert, de a HEAD $HEAD_SHA. Elobb allj ra: git checkout $ALLOW_DETACHED"

  # Csak visszafele lehet lepni a main torteneteben. Egy tetszoleges agra
  # allast ez a kapcsolo NEM enged, mert az mar nem visszaallas, hanem egy
  # masik allapot telepitese.
  git merge-base --is-ancestor "$TARGET_SHA" "$REMOTE_SHA" \
    || fail "a megadott commit nincs rajta a(z) $REMOTE/$BRANCH torteneten. A --allow-detached visszaallasra valo, nem tetszoleges allapot telepitesere."

  echo "szandekos visszaallas: $TARGET_SHA"
  echo "FIGYELEM: ez nem a(z) $REMOTE/$BRANCH feje ($REMOTE_SHA)."
else
  [ "$HEAD_SHA" = "$REMOTE_SHA" ] \
    || fail "a HEAD ($HEAD_SHA) nem a(z) $REMOTE/$BRANCH feje ($REMOTE_SHA). Huzd le, vagy hasznald a --allow-detached kapcsolot, ha szandekosan allsz vissza."
  echo "a HEAD a(z) $REMOTE/$BRANCH feje: $HEAD_SHA"
fi

SHORT_SHA="$(printf '%s' "$HEAD_SHA" | cut -c1-12)"
COMMIT_SUBJECT="$(git log -1 --format=%s "$HEAD_SHA")"

# ---------------------------------------------------------------------------
# 3. Migracio: nem futtatjuk, de nem is megyunk el mellette
# ---------------------------------------------------------------------------

step "3. Migracio-ellenorzes"

# MEDDIG LAT EL EZ A FEK: csak a Medusa modulok migracios konyvtarat nezi, es
# csak a HOZZAADOTT fajlokat (--diff-filter=A). Ma ez fedi a valosagot, mert a
# "medusa db:generate" ide teszi oket. Ha valaha mashova kerul migracio, vagy
# egy meglevo fajlt IRNAK AT, ez a fek CSENDBEN engedi at. Ha a szerkezet
# valtozik, ez a minta is valtozzon vele.
MIGRATION_GLOB='apps/backend/src/modules/*/migrations/*.ts'
PREVIOUS_SHA=""

if [ -f "$DEPLOYED_FILE" ]; then
  PREVIOUS_SHA="$(grep -m1 -oE '^- commit: [0-9a-f]{40}' "$DEPLOYED_FILE" | awk '{print $3}')"
fi

MIGRATION_NOTE=""

# EZ MAR NEM KAPU, HANEM ERTESITES -- es a valtozas oka fontosabb a valtozasnal.
#
# Amig a migraciot EMBER futtatta, volt ertelme megtagadni a telepitest, amig
# meg nem erositette. 2026-09-01 ota a KONTENER futtatja, indulaskor (lasd
# apps/backend/docker-entrypoint.sh), es akkor is megall, ha a migracio bukik.
# Ettol a --migrations-applied kapcsolo nem egyszeruen folosleges lett, hanem
# MEGTEVESZTO: a hivo egy olyan dolgot allitott volna, amit nem o csinal.
# Ezert a kapcsolo ki is kerult, nem no-op-kent maradt bent.
#
# AMIT EZ NEM OLD MEG, ES AMIERT AZ ERTESITES A FAJLNEVEKET SOROLJA:
# az automatikus migracio nem megvalaszolja a regi kerdest, hanem KICSERELI.
# Nem az a kerdes tobbe, hogy lefuttattad-e, hanem hogy szabad-e FELUGYELET
# NELKUL lefutnia. Egy oszlopot torlo migracio mostantol magatol elindul a
# kontener indulasakor. A darabszam ("ket uj migracio") errol semmit nem mond;
# a fajlnevbol latszik, hogy torles vagy bovites. Ezert nevek, nem szam.
#
# ES AZERT ALL A TELEPITES ELOTT: egy figyelmeztetes, ami az esemeny utan jon,
# kronika, nem ovintezkedes. Ez a blokk a build es a kontener-inditas ELOTT fut.

# ISMERT POZITIV ESET, MIELOTT BARMIT ALLITANANK A HIANYROL.
#
# A fenti minta szuk, es a sajat fejlece is kimondja, hogy ha a migraciok
# valaha mashova kerulnek, CSENDBEN enged at mindent. Egy "nincs uj migracio"
# uzenet ilyenkor nem a valosagrol szol, hanem a mintarol -- es epp az a
# fajta megnyugtato nulla, amire nem szoktunk rakerdezni.
#
# Ezert a script eloszor megnezi, hogy a minta a JELENLEGI fan talal-e
# egyaltalan valamit. Ha nem, a hiany-uzenetnek nincs bizonyito ereje, es ezt
# ki is mondja.
MIGRATION_FILES_TODAY="$(git ls-files "$MIGRATION_GLOB" | wc -l | tr -d ' ')"
if [ "$MIGRATION_FILES_TODAY" = "0" ]; then
  echo >&2
  echo "FIGYELEM: a migracios minta ($MIGRATION_GLOB) a JELENLEGI fan sem talal" >&2
  echo "egyetlen fajlt sem. Vagy elkerultek a migraciok, vagy a minta avult el." >&2
  echo "Amig ez igy all, az alabbi migracios uzenet NEM bizonyit semmit." >&2
  echo >&2
fi

if [ -z "$PREVIOUS_SHA" ]; then
  MIGRATION_NOTE="a kontener futtatja indulaskor (nincs feljegyzett elozo telepites, igy nem tudom felsorolni, mi az uj)"
  echo >&2
  echo "MIGRACIO: nincs feljegyzett korabbi telepites ($DEPLOYED_FILE)," >&2
  echo "tehat nem tudom megmondani, mi az UJ ebben a commitban." >&2
  echo "A kontener indulaskor minden fuggo migraciot lefuttat." >&2
  echo >&2
elif [ "$PREVIOUS_SHA" = "$HEAD_SHA" ]; then
  MIGRATION_NOTE="nincs uj (ugyanaz a commit, mint a legutobbi telepitesnel)"
  echo "MIGRACIO: az elozo telepites ugyanez a commit volt, nincs uj migracio."
else
  NEW_MIGRATIONS="$(git diff --name-only --diff-filter=A "$PREVIOUS_SHA" "$HEAD_SHA" -- "$MIGRATION_GLOB" 2>/dev/null)"

  if [ -n "$NEW_MIGRATIONS" ]; then
    MIGRATION_NOTE="a kontener futtatja indulaskor: $(echo "$NEW_MIGRATIONS" | tr '\n' ' ' | sed 's/ $//')"
    echo >&2
    echo "MIGRACIO: ez a telepites UJ migraciokat hoz, es a kontener" >&2
    echo "indulaskor MAGATOL lefuttatja oket, felugyelet nelkul:" >&2
    echo "$NEW_MIGRATIONS" | sed 's/^/  /' >&2
    echo >&2
    echo "Ha barmelyik torol vagy szukit, most nezd meg, mielott elindul." >&2
    echo >&2
  else
    MIGRATION_NOTE="nincs uj (a(z) $PREVIOUS_SHA ota nincs uj migracios fajl)"
    echo "MIGRACIO: a(z) $PREVIOUS_SHA ota nincs uj migracios fajl."
  fi
fi

# ---------------------------------------------------------------------------
# 4. Epites
# ---------------------------------------------------------------------------

step "4. A kep epitese"

command -v docker >/dev/null 2>&1 || fail "nincs docker a gepen"

FULL_TAG="$IMAGE_NAME:$SHORT_SHA"
MOVING_TAG="$IMAGE_NAME:$STAGE_TAG"

echo "cimke:        $FULL_TAG"
echo "GIT_SHA:      $HEAD_SHA"

# A build CSAK a rovid azonositos cimket adja. A mozgo "stage" cimke a
# visszameres UTAN kerul fel, kulon lepesben.
#
# Miert nem egyszerre: ha a build sikerul, de a belyegzes rossz (a cimke vagy a
# kornyezeti valtozo nem egyezik a commit-tal), akkor a build parancsban egyutt
# kiadott "stage" cimke MAR arra a kepre mutatna, es a kovetkezo
# "docker compose up" azt inditana el, holott a szkript megtagadta a telepitest.
# Igy viszont igaz marad az, amiert az egesz szkript van: a "stage" cimke SOSEM
# mutat ellenorizetlen kepre.
docker build \
  --build-arg "GIT_SHA=$HEAD_SHA" \
  -t "$FULL_TAG" \
  -f Dockerfile \
  . || fail "a 'docker build' elhasalt. A kep NEM keszult el, es a DEPLOYED.md sem irodott ki."

# ---------------------------------------------------------------------------
# 5. Visszaolvasas: a cimke es a kornyezeti valtozo egyezzen a commit-tal
# ---------------------------------------------------------------------------

step "5. A kep visszamerese"

LABEL_SHA="$(docker image inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$FULL_TAG" 2>/dev/null)"
[ "$LABEL_SHA" = "$HEAD_SHA" ] \
  || fail "a kep cimkeje ($LABEL_SHA) nem egyezik a commit-tal ($HEAD_SHA)."
echo "cimke rendben: org.opencontainers.image.revision = $LABEL_SHA"

ENV_SHA="$(docker image inspect --format '{{range .Config.Env}}{{println .}}{{end}}' "$FULL_TAG" 2>/dev/null | sed -n 's/^APP_GIT_SHA=//p')"
[ "$ENV_SHA" = "$HEAD_SHA" ] \
  || fail "a kepben az APP_GIT_SHA ($ENV_SHA) nem egyezik a commit-tal ($HEAD_SHA)."
echo "kornyezeti valtozo rendben: APP_GIT_SHA = $ENV_SHA"

# Helyben epitett kepnek nincs repo digestje: az csak akkor keletkezik, ha a
# kep felkerult egy registrybe. Amit itt vissza lehet olvasni, az a kep sajat
# azonositoja, es ez az, ami tenylegesen fut.
IMAGE_DIGEST="$(docker image inspect --format '{{.Id}}' "$FULL_TAG" 2>/dev/null)"
REPO_DIGEST="$(docker image inspect --format '{{if .RepoDigests}}{{index .RepoDigests 0}}{{end}}' "$FULL_TAG" 2>/dev/null)"

if [ -n "$REPO_DIGEST" ]; then
  DIGEST_NOTE="$REPO_DIGEST (repo digest)"
else
  DIGEST_NOTE="$IMAGE_DIGEST (kep azonosito, helyben epitett kepnek nincs repo digestje)"
fi
echo "digest: $DIGEST_NOTE"

# ---------------------------------------------------------------------------
# 6. A mozgo cimke, csak most
# ---------------------------------------------------------------------------

step "6. A mozgo cimke ratetele"

docker tag "$FULL_TAG" "$MOVING_TAG" \
  || fail "a mozgo cimke ratetele nem sikerult. A kep megvan es ellenorzott ($FULL_TAG), de a '$MOVING_TAG' cimke NEM mutat ra."

MOVING_ID="$(docker image inspect --format '{{.Id}}' "$MOVING_TAG" 2>/dev/null)"
[ -n "$MOVING_ID" ] && [ "$MOVING_ID" = "$IMAGE_DIGEST" ] \
  || fail "a '$MOVING_TAG' cimke nem ugyanarra a kepre mutat, mint a(z) '$FULL_TAG'."
echo "mozgo cimke rendben: $MOVING_TAG -> $FULL_TAG"

# ---------------------------------------------------------------------------
# 7. DEPLOYED.md
# ---------------------------------------------------------------------------

step "7. A DEPLOYED.md kiirasa"

LOCAL_TIME="$(date '+%Y-%m-%d %H:%M:%S %Z')"
UTC_TIME="$(date -u '+%Y-%m-%d %H:%M:%S UTC')"
RUN_BY="$(id -un 2>/dev/null || echo ismeretlen)@$(hostname 2>/dev/null || echo ismeretlen)"

cat > "$DEPLOYED_FILE" <<EOF
# Ami a stage kornyezetben fut

Ezt a fajlt a \`infra/deploy-stage.sh\` szkript irja. **Ne szerkeszd kezzel:** egy kezzel
vezetett telepitesi naplo pontosan addig igaz, amig valaki elfelejti.

- commit: $HEAD_SHA
- commit cime: $COMMIT_SUBJECT
- kep cimke: $FULL_TAG
- mozgo cimke: $MOVING_TAG
- digest: $DIGEST_NOTE
- idopont (helyi): $LOCAL_TIME
- idopont (UTC): $UTC_TIME
- futtatta: $RUN_BY
- migracio: $MIGRATION_NOTE
- munkafa a build pillanataban: tiszta (a szkript merte, nem kovetett fajllal egyutt)
EOF

[ -f "$DEPLOYED_FILE" ] || fail "a DEPLOYED.md kiirasa nem sikerult: $DEPLOYED_FILE"
echo "kiirva: $DEPLOYED_FILE"

# ---------------------------------------------------------------------------
# 8. Ami hatravan, es amit a szkript szandekosan nem tesz meg
# ---------------------------------------------------------------------------

step "8. Kesz"

cat <<EOF

A kep elkeszult es meg van cimkezve. A kontenerek inditasa NEM ennek a
szkriptnek a dolga, mert a docker-compose.yml nincs a repoban.

A kovetkezo lepes a hoston:

  cd /opt/acropora-commerce-stage/infra
  docker compose up -d medusa-server medusa-worker

Ellenorzes utana, ket fuggetlen uton:

  docker inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' $MOVING_TAG
  docker compose exec medusa-server printenv APP_GIT_SHA

Mindkettonek ezt kell adnia: $HEAD_SHA

EOF
