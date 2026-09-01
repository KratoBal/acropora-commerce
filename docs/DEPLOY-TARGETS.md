# Where this repository deploys

Measured 2026-09-01 from both Coolify APIs. Three applications build from this repository, all
from `main`, and they do **not** behave the same way.

| Application | Machine | Deploys itself on a push? |
|---|---|---|
| `acropora-commerce-medusa` (`commerce.acropora.hu`) | production | **No. Manual only.** Someone triggers it. |
| `commerce-staging-medusa` (`commerce-stage.acropora.hu`) | staging (second Coolify) | being measured, see below |
| `commerce-staging-medusa-worker` | staging (second Coolify) | being measured, see below |

**The production instance is manual only on purpose.** A merge to `main` publishes nothing to
the live shop; a person starts that deployment. Treat any claim to the contrary as a change
worth checking, because it moves what a merge means.

## Why this file exists

On 2026-09-01 the same infrastructure questions were asked three times in one afternoon, and
every answer already existed in a document nobody had open at that moment. The fix is not
another map: it is putting the answer where the question gets asked. A merge happens here, so
what a merge does belongs here.

## What is still being measured

Whether a push to `main` redeploys the two staging applications by itself. The Acropora OS
repository was tested first: a merge at 15:05 did not trigger anything, a second merge at
15:14 did. This file will say which of the two happens here once a push has actually proved
it, and not before. An expectation is not a measurement.
