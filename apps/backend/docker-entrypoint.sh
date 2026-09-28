#!/bin/sh
# Runs before the Medusa server ever accepts a request. Applies pending
# migrations against DATABASE_URL and REFUSES to start the server if that
# fails - a container with a broken or empty schema must stop, not serve.
#
# WHY THIS EXISTS: on 2026-09-01 the live shop was rebuilt onto a fresh,
# empty PostgreSQL and Medusa started against a database with no tables. The
# container came up and served requests; nothing had ever run the migrations.
# The Dockerfile's own HEALTHCHECK comment already assumed otherwise - it
# allows 60 seconds of start-up "because the FIRST start can take longer with
# a migration" - so the expectation was written down and simply not
# implemented anywhere.
#
# WHY NOT `CMD ["sh","-c","npx medusa db:migrate && npx medusa start ..."]`:
# a shell chain hides the exit code of the first command behind the second's
# process, and it makes the failure mode depend on how the shell was invoked.
# An entrypoint with `set -e` stops before `exec` is ever reached, so the
# container exits with the migration's own status and the orchestrator sees a
# failed start rather than a healthy-looking server on an empty schema.
#
# WHY `exec "$@"` AND NOT A HARDCODED START COMMAND: the Dockerfile's CMD
# stays the single place that says how the server runs, and stays
# overridable - `docker run <image> npx medusa user -e ...` still works,
# with the migration still applied first.
#
# POSIX sh, not bash: the runner stage is node:22-bookworm-slim and this
# needs no bash-only syntax.
set -e

# EVERY MEDUSA STEP RUNS UNDER A DEADLINE. A step that waits for input never
# returns and never exits - no exit code, no log line, just a container that
# does not start. On 2026-09-28 the link sync did exactly that. `--execute-
# safe-links` (below) closes that one question; the deadline closes the next
# one, whichever Medusa version brings it. Closing stdin is no substitute:
# the prompt library keeps waiting on a closed stdin (measured, 2026-09-28).
#
# Generous by default, because a real data migration may legitimately run
# long. Overridable per environment: MEDUSA_STEP_TIMEOUT_SECONDS.
STEP_TIMEOUT="${MEDUSA_STEP_TIMEOUT_SECONDS:-900}"

# The deadline depends on coreutils' `timeout`. If it is missing, refuse
# rather than run without the guard - a silently absent guard is the fault
# this whole block exists to prevent.
if ! command -v timeout >/dev/null 2>&1; then
  echo "docker-entrypoint: 'timeout' not found - refusing to start without the step deadline." >&2
  exit 1
fi

# Runs one step under the deadline. On expiry (exit 124) it says WHICH step
# stalled; any other failure keeps the step's own exit code. `-k 30`: if the
# step ignores SIGTERM, it is killed 30 s later.
run_step() {
  timeout -k 30 "$STEP_TIMEOUT" "$@" || {
    status=$?
    if [ "$status" -eq 124 ]; then
      echo "docker-entrypoint: '$*' did not finish within ${STEP_TIMEOUT}s - refusing to start." >&2
    fi
    exit "$status"
  }
}

# THE FIRST REFUSAL IS THE CHEAPEST ONE, AND IT RUNS FIRST FOR THAT REASON.
#
# Without MEDUSA_FILE_BACKEND_URL the file provider falls back to
# `http://localhost:9000/static` (measured in @medusajs/file-local): the deploy
# comes up, every one of OUR screens looks right, and the STOREFRONT shows a
# broken image to the customer. Nothing fails and nothing is logged - the
# silence is the fault, not the missing variable.
#
# Plain `node`, not `medusa exec`: this reads one environment variable and needs
# neither the database nor the application container. Booting the app for it
# would turn the fastest check into the slowest one.
echo "docker-entrypoint: verifying the public image prefix..."
node ./src/scripts/verify-file-backend-url.js

# ONLY ONE CONTAINER MIGRATES. The server and the worker run the same image
# and the same entrypoint, so until 2026-09-28 BOTH applied the migrations, to
# the same database, at the same time: after the 2.20.1 upgrade two containers
# hung on the same link prompt (stage logs, 13:51 and 13:58 UTC).
#
# RUN_MIGRATIONS=false (set on the worker) skips the migration. The link check
# below still runs, read-only, so a worker never starts on a link schema the
# code does not match - it refuses, and the orchestrator restarts it until the
# migrating container has done its part.
#
# Only "true" and "false" are accepted. Anything else refuses the start: a
# misspelt value must not quietly migrate (or quietly not).
RUN_MIGRATIONS="${RUN_MIGRATIONS:-true}"
case "$RUN_MIGRATIONS" in
  true | false) ;;
  *)
    echo "docker-entrypoint: RUN_MIGRATIONS must be 'true' or 'false', got '$RUN_MIGRATIONS' - refusing to start." >&2
    exit 1
    ;;
esac

if [ "$RUN_MIGRATIONS" = "true" ]; then
  echo "docker-entrypoint: applying Medusa migrations..."
  # `--execute-safe-links`: THE LINK SYNC MUST NEVER ASK. Without a flag, a link
  # change that is not purely additive opens an interactive checkbox, and a
  # container has nobody to answer it: on 2026-09-28 the stage backend waited on
  # that question after the 2.20.1 upgrade and never started. Closing stdin does
  # not help - the prompt keeps waiting (measured). `--execute-all-links` would
  # answer by itself, but it can DELETE link tables, and that is not a decision
  # for an unattended start.
  #
  # The safe flag, however, drops those changes WITHOUT A WORD, so the next step
  # asks for the plan again and refuses the start if anything is left.
  run_step npx medusa db:migrate --execute-safe-links
else
  echo "docker-entrypoint: RUN_MIGRATIONS=false - not migrating; another container applies them."
fi

# THE LINK SYNC'S LEFTOVERS, LOUDLY. Whatever `--execute-safe-links` skipped
# (an altered or removed link table) stops the start here, with the table names
# and the command that resolves it - after a backup, by a person.
echo "docker-entrypoint: verifying the link tables..."
run_step npx medusa exec ./src/scripts/verify-links-in-sync.js

# THE THIRD REFUSAL, AND IT IS HERE FOR THE SAME REASON AS THE OTHER TWO.
#
# The six shipping option ids are carried into every environment by hand. If one
# is wrong, the shop starts, the checkout offers no payment method, and NOTHING
# says so. Measured on 2026-09-03: the check that was supposed to catch this sat
# in a module loader, where `query` does not exist, and reported on every single
# start that it could not run. Structural, not environmental - a module loader
# gets the module's own container.
#
# `medusa exec` boots the app container, so the query works here. The path is
# the COMPILED file: the runner stage copies `.medusa/server` to /app, so the
# source-tree path does not exist in the image.
echo "docker-entrypoint: verifying the shipping option ids..."
run_step npx medusa exec ./src/scripts/verify-shipping-option-roles.js

echo "docker-entrypoint: migrations applied, links and ids verified, starting server..."

exec "$@"
