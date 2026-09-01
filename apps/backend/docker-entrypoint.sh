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

echo "docker-entrypoint: applying Medusa migrations..."
npx medusa db:migrate
echo "docker-entrypoint: migrations applied, starting server..."

exec "$@"
