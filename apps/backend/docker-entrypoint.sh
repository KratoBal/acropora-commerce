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

echo "docker-entrypoint: applying Medusa migrations..."
npx medusa db:migrate

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
npx medusa exec ./src/scripts/verify-shipping-option-roles.js

echo "docker-entrypoint: migrations applied, ids verified, starting server..."

exec "$@"
