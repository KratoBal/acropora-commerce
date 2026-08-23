#!/usr/bin/env bash
#
# Mi van most BEKAPCSOLVA a stage kornyezetben, es mikor lett az.
#
# A DEPLOYED.md azt mondja meg, melyik KOD fut. Ez a szkript azt, hogy a futo kod
# milyen ALLAPOTBAN van bekapcsolva: melyik fizetesi szolgaltato melyik regiohoz
# van kotve, es mire all a szerep-lekepezes. A ketto kulon fajl, mert kulon is
# valtozik: egy telepites nem allit at kapcsolatot, egy kapcsolat-allitas pedig
# nem telepit.
#
# AMIT A FAJL NEM TUD, es ezt itt kell kimondani, mert kulonben a kovetkezo
# olvaso a fajlban fogja keresni:
#
#   Azt tudja, MI van most beallitva. Azt NEM, hogy MIERT.
#
#   Az indok a dontesi naploban all (docs/ACROPORA-COMMERCE-DECISIONS.md), es
#   ott is marad. Ez a fajl nem mondja meg, hogy egy szolgaltato azert van egy
#   regiohoz kotve, mert uzleti dontes szolt rola, vagy azert, mert valaki
#   probalgatott. Nem mondja meg azt sem, hogy ami itt all, az HELYES-e.
#   Egyetlen dolgot allit: ezt merte, ekkor.
#
# Amit csinal:
#   1. ellenorzi, hogy a mert tablak es mezok tenyleg leteznek
#   2. kiolvassa a futo kontenerbol a commitot es a szerep-lekepezest
#   3. lekerdezi MINDEN regio fizetesi szolgaltatoit, torolt sorok nelkul
#   4. kiirja az ACTIVATED.md fajlt: felul a mai allapot, alul append-only tortenet
#
# Amit NEM csinal, szandekosan:
#   - SEMMIT nem ir a mert rendszerbe: nem aktival, nem javit, nem hoz letre
#   - nem indit es nem allit le kontenert
#   - nem olvas jelszot: a lekerdezes a postgres kontener SAJAT kornyezetevel fut
#
# Ettol barmikor ujrafuttathato, es onmagaban is ellenorzes: ha a kimenete
# megvaltozik anelkul, hogy barki hozzanyult volna a rendszerhez, az riasztas.
#
# Hasznalat:
#   bash infra/activated-state.sh
#   ACTIVATED_FILE=/tmp/x.md bash infra/activated-state.sh   # mashova ir
#
# Kornyezeti valtozok, ha a kontenerek maskepp hivjak oket:
#   PG_CONTAINER      alapertelmezes: acropora-commerce-postgres-stage
#   SERVER_CONTAINER  alapertelmezes: acropora-commerce-medusa-server-stage
#
# set -e szandekosan NINCS egyedul: minden lepes utan kifejezett ellenorzes all,
# hogy a hiba ne csak megallitson, hanem meg is mondja, mi a baj.

set -uo pipefail

PG_CONTAINER="${PG_CONTAINER:-acropora-commerce-postgres-stage}"
SERVER_CONTAINER="${SERVER_CONTAINER:-acropora-commerce-medusa-server-stage}"

HISTORY_MARKER="<!-- allapot-tortenet: append-only, a szkript ez ala ir. Ne szerkeszd. -->"

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
  sed -n '2,45p' "$0" | sed 's/^# \{0,1\}//'
  exit 0
}

case "${1:-}" in
  -h|--help) usage ;;
  "") ;;
  *) fail "ismeretlen kapcsolo: $1" ;;
esac

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"
[ -n "$REPO_ROOT" ] || fail "ezt a szkriptet a repon belulrol kell futtatni"
cd "$REPO_ROOT" || fail "nem tudtam belepni a repo gyokerebe: $REPO_ROOT"

ACTIVATED_FILE="${ACTIVATED_FILE:-$REPO_ROOT/ACTIVATED.md}"

command -v docker >/dev/null 2>&1 || fail "nincs docker a gepen"

# psql futtatasa a postgres kontener sajat kornyezetevel. A felhasznalo es az
# adatbazis neve a kontenerbol jon, jelszo sehol nem hagyja el a kontenert.
psql_query() {
  docker exec "$PG_CONTAINER" sh -c \
    'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -At -F "|" -c "$0"' \
    "$1" 2>&1
}

# ---------------------------------------------------------------------------
# 1. A mert szerkezet letezik-e egyaltalan
# ---------------------------------------------------------------------------
#
# A region_payment_provider GENERALT tabla: a link-modules deklaraciojabol
# keletkezik, tehat egy Medusa-frissites atnevezheti a mi kodunk erintese
# nelkul. Ha ilyenkor ures listat irnank ki, az pontosan ugy nezne ki, mint egy
# tenyleg ures regio. Ezert itt hangosan elhasalunk.

step "1. A mert tablak es mezok"

docker inspect "$PG_CONTAINER" >/dev/null 2>&1 \
  || fail "nincs ilyen kontener: $PG_CONTAINER (allitsd a PG_CONTAINER valtozot)"

for table in region region_payment_provider payment_provider; do
  present="$(psql_query "SELECT to_regclass('public.${table}') IS NOT NULL")"
  case "$present" in
    t) ;;
    f) fail "hianyzik a tabla: ${table}. A szerkezet megvaltozott, es egy ures lista ugyanugy nezne ki, mint egy ures regio." ;;
    *) fail "a ${table} tabla ellenorzese nem sikerult: ${present}" ;;
  esac

  has_deleted_at="$(psql_query "SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='${table}' AND column_name='deleted_at'")"
  [ "$has_deleted_at" = "1" ] \
    || fail "a ${table} tablan nincs deleted_at mezo. Enelkul nem tudom kiszurni a puhan torolt sorokat, es a fajl egy mar nem elo kapcsolatot allitana."
done

echo "region, region_payment_provider, payment_provider: megvan, deleted_at mezovel"

# ---------------------------------------------------------------------------
# 2. A futo kontener: commit es szerep-lekepezes
# ---------------------------------------------------------------------------

step "2. A futo kontener"

docker inspect "$SERVER_CONTAINER" >/dev/null 2>&1 \
  || fail "nincs ilyen kontener: $SERVER_CONTAINER (allitsd a SERVER_CONTAINER valtozot)"

RUNNING_SHA="$(docker exec "$SERVER_CONTAINER" printenv APP_GIT_SHA 2>/dev/null)"
[ -n "$RUNNING_SHA" ] || RUNNING_SHA="(nincs beallitva)"

# A printenv 1-gyel ter vissza, ha a valtozo nincs beallitva. A hianya MERT
# ALLAPOT, nem szkripthiba: ilyenkor a szerep-lekepezes ures, es a dij nulla.
COD_PROVIDER_ENV="$(docker exec "$SERVER_CONTAINER" printenv ACROPORA_PP_COD 2>/dev/null)"
[ -n "$COD_PROVIDER_ENV" ] || COD_PROVIDER_ENV="(nincs beallitva)"

echo "APP_GIT_SHA:      $RUNNING_SHA"
echo "ACROPORA_PP_COD:  $COD_PROVIDER_ENV"

# ---------------------------------------------------------------------------
# 3. A regiok es a hozzajuk kotott szolgaltatok
# ---------------------------------------------------------------------------
#
# KULSO illesztes, nem belso: egy NULLA szolgaltatoju regio belso illesztessel
# eltunne, es akkor a "nincs semmije" allitas megkulonboztethetetlen lenne
# attol, hogy meg sem neztuk. Az "erintetlen regio" allitast pontosan ugy kell
# bizonyitani, hogy a regio OTT VAN a listaban, a sajat tartalmaval.
#
# A regiokra NINCS nevszures. Ma ketto van, de a fajl attol lesz hasznalhato
# fel ev mulva, hogy azt irja le, AMI VAN, nem azt, amit ma vartunk.

step "3. Regiok es szolgaltatok"

REGION_ROWS="$(psql_query "
SELECT r.id,
       r.name,
       r.currency_code,
       coalesce(rpp.payment_provider_id, ''),
       coalesce(pp.id, ''),
       coalesce(pp.is_enabled::text, ''),
       coalesce(to_char(rpp.created_at, 'YYYY-MM-DD HH24:MI:SS'), '')
FROM region r
LEFT JOIN region_payment_provider rpp
       ON rpp.region_id = r.id
      AND rpp.deleted_at IS NULL
LEFT JOIN payment_provider pp
       ON pp.id = rpp.payment_provider_id
      AND pp.deleted_at IS NULL
WHERE r.deleted_at IS NULL
ORDER BY r.name, rpp.payment_provider_id
")"

case "$REGION_ROWS" in
  *ERROR*) fail "a regio-lekerdezes elhasalt: $REGION_ROWS" ;;
esac
[ -n "$REGION_ROWS" ] || fail "egyetlen elo regio sincs. Ez lehet igaz, de sokkal valoszinubb, hogy a lekerdezes nem azt merte, amit hittunk."

PROVIDER_ROWS="$(psql_query "
SELECT id, is_enabled
FROM payment_provider
WHERE deleted_at IS NULL
ORDER BY id
")"

case "$PROVIDER_ROWS" in
  *ERROR*) fail "a szolgaltato-lekerdezes elhasalt: $PROVIDER_ROWS" ;;
esac

echo "$REGION_ROWS" | awk -F'|' '{print "  " $2 " (" $1 ") -> " ($4 == "" ? "nincs szolgaltatoja" : $4)}'

# ---------------------------------------------------------------------------
# 4. Az ACTIVATED.md kiirasa
# ---------------------------------------------------------------------------

step "4. Az ACTIVATED.md kiirasa"

LOCAL_TIME="$(date '+%Y-%m-%d %H:%M:%S %Z')"
UTC_TIME="$(date -u '+%Y-%m-%d %H:%M:%S UTC')"
RUN_BY="$(id -un 2>/dev/null || echo ismeretlen)@$(hostname 2>/dev/null || echo ismeretlen)"

# A mai allapot szoveges alakja. Az ujjlenyomat EBBOL keszul, tehat a
# visszameres idopontja NEM valtoztatja meg: csak a valodi allapotvaltozas.
render_state() {
  echo "- futo commit (APP_GIT_SHA): $RUNNING_SHA"
  echo "- ACROPORA_PP_COD: $COD_PROVIDER_ENV"
  echo
  echo "### Regiok"
  echo

  local current=""
  local had_provider="nem"

  while IFS='|' read -r region_id region_name currency link_provider provider_id enabled activated_at; do
    [ -n "$region_id" ] || continue

    if [ "$region_id" != "$current" ]; then
      if [ -n "$current" ]; then
        [ "$had_provider" = "nem" ] && echo "  - nincs egyetlen fizetesi szolgaltatoja sem"
        echo
      fi
      echo "**$region_name** (\`$region_id\`, $currency)"
      current="$region_id"
      had_provider="nem"
    fi

    if [ -z "$link_provider" ]; then
      continue
    fi

    had_provider="igen"

    if [ -z "$provider_id" ]; then
      # A kapcsolat el, de a szolgaltato sora nincs meg (vagy puhan torolt).
      # Ezt nem hallgatjuk el: egy ilyen sor a penztarban hibat okoz.
      echo "  - \`$link_provider\` -- FIGYELEM: a szolgaltato sora nem elo, a kapcsolat viszont igen (aktivalva: ${activated_at:-ismeretlen})"
    else
      echo "  - \`$provider_id\` (engedelyezve: $enabled, aktivalva: ${activated_at:-ismeretlen})"
    fi
  done <<EOF
$REGION_ROWS
EOF

  if [ -n "$current" ] && [ "$had_provider" = "nem" ]; then
    echo "  - nincs egyetlen fizetesi szolgaltatoja sem"
  fi

  echo
  echo "### Regisztralt fizetesi szolgaltatok"
  echo
  echo "$PROVIDER_ROWS" | awk -F'|' '$1 != "" {print "- `" $1 "` (engedelyezve: " $2 ")"}'
}

STATE_BLOCK="$(render_state)"
[ -n "$STATE_BLOCK" ] || fail "az allapot-blokk ures maradt, ezt nem irom ki"

if command -v sha256sum >/dev/null 2>&1; then
  STATE_HASH="$(printf '%s\n' "$STATE_BLOCK" | sha256sum | cut -c1-12)"
else
  STATE_HASH="(nincs sha256sum)"
fi

# A regi tortenet atmentese. Ha a fajl letezik, de a jelolo NINCS benne, akkor
# vagy kezzel irtak at, vagy nem ez a szkript keszitette: ilyenkor NEM irjuk
# felul, mert az egy append-only tortenet csendes eldobasa lenne.
OLD_HISTORY=""
LAST_HASH=""
if [ -f "$ACTIVATED_FILE" ]; then
  if ! grep -qF "$HISTORY_MARKER" "$ACTIVATED_FILE"; then
    fail "a $ACTIVATED_FILE letezik, de nincs benne a tortenet-jelolo. Nem irom felul: eloszor nezd meg, mi van benne."
  fi
  OLD_HISTORY="$(sed -n "/$(printf '%s' "$HISTORY_MARKER" | sed 's/[]\/$*.^[]/\\&/g')/,\$p" "$ACTIVATED_FILE" | tail -n +2)"
  LAST_HASH="$(printf '%s\n' "$OLD_HISTORY" | sed -n 's/.*allapot `\([0-9a-f]*\)`.*/\1/p' | tail -1)"
fi

NEW_ENTRY=""
if [ "$STATE_HASH" != "$LAST_HASH" ]; then
  NEW_ENTRY="- $LOCAL_TIME -- allapot \`$STATE_HASH\`, commit \`$RUNNING_SHA\`, ACROPORA_PP_COD: \`$COD_PROVIDER_ENV\` (irta: $RUN_BY)"
fi

TMP_FILE="$(mktemp "${ACTIVATED_FILE}.XXXXXX")" || fail "nem tudtam ideiglenes fajlt letrehozni"

{
  cat <<EOF
# Ami a stage kornyezetben be van kapcsolva

Ezt a fajlt a \`infra/activated-state.sh\` szkript irja. **Ne szerkeszd kezzel.**

A \`DEPLOYED.md\` azt mondja meg, melyik KOD fut. Ez a fajl azt, hogy a futo kod milyen
ALLAPOTBAN van bekapcsolva.

**Amit ez a fajl nem tud:** azt tudja, MI van most beallitva, azt NEM, hogy MIERT. Az indok a
dontesi naploban all (\`docs/ACROPORA-COMMERCE-DECISIONS.md\`). Azt sem mondja meg, hogy ami
itt all, az helyes-e. Egyetlen dolgot allit: ezt merte, ekkor.

- utolso visszameres (helyi): $LOCAL_TIME
- utolso visszameres (UTC): $UTC_TIME
- merte: $RUN_BY
- allapot-ujjlenyomat: \`$STATE_HASH\`

## A mert allapot

EOF

  printf '%s\n' "$STATE_BLOCK"

  cat <<EOF

Az "aktivalva" idopont a kapcsolat sorabol jon (\`region_payment_provider.created_at\`), nem
ebbol a fajlbol. Tehat akkor is megmarad, ha ezt a fajlt valaki letorli.

A torolt sorok (\`deleted_at\`) mindharom tablabol ki vannak szurve. Egy lecsatolt szolgaltato
sora bent marad az adatbazisban, es szures nelkul ez a fajl egy mar nem elo kapcsolatot
allitana.

## Allapot-tortenet

Uj sor csak akkor keletkezik, ha az allapot VALTOZOTT. Egy ujabb visszameres onmagaban nem ir
ide semmit, csak a fenti idopontot frissiti.

$HISTORY_MARKER
EOF

  [ -n "$OLD_HISTORY" ] && printf '%s\n' "$OLD_HISTORY"
  [ -n "$NEW_ENTRY" ] && printf '%s\n' "$NEW_ENTRY"
} > "$TMP_FILE"

[ -s "$TMP_FILE" ] || { rm -f "$TMP_FILE"; fail "az ideiglenes fajl ures maradt, nem irom felul a meglevot"; }

mv "$TMP_FILE" "$ACTIVATED_FILE" || { rm -f "$TMP_FILE"; fail "nem tudtam a helyere tenni: $ACTIVATED_FILE"; }

echo "kiirva: $ACTIVATED_FILE"
if [ -n "$NEW_ENTRY" ]; then
  echo "az allapot VALTOZOTT az elozo meres ota, uj tortenet-sor keletkezett"
else
  echo "az allapot valtozatlan, a tortenet nem bovult"
fi
