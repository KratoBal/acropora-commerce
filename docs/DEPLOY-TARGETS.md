# Where this repository deploys

Measured 2026-09-01 from both Coolify APIs. Three applications build from this repository, all
from `main`, and they do **not** behave the same way.

| Application | Machine | Deploys itself on a push? |
|---|---|---|
| `acropora-commerce-medusa` (`commerce.acropora.hu`) | production | **No. Manual only.** Someone triggers it. |
| `commerce-staging-medusa` (`commerce-stage.acropora.hu`) | staging (second Coolify) | yes, through a repository webhook |
| `commerce-staging-medusa-worker` | staging (second Coolify) | yes, through a repository webhook |

**The production instance is manual only on purpose.** A merge to `main` publishes nothing to
the live shop; a person starts that deployment. Treat any claim to the contrary as a change
worth checking, because it moves what a merge means.

## How the two staging applications learn about a push

They are wired to this repository with a **deploy key**, not through the GitHub App. A deploy
key lets Coolify pull the code; it gives GitHub no way to announce that something changed. That
is why a merge on 2026-09-01 at 15:18 left both of them untouched.

Two repository webhooks were added at 15:47, one per application. Both point at the **same**
Coolify URL — `/webhooks/source/github/events/manual` — and carry **different** secrets,
because Coolify identifies the application by the secret, not by the path. Both are limited to
the `push` event.

**The consequence worth remembering:** if either application is ever recreated, its secret
changes and its webhook has to be replaced. A webhook that silently stops matching looks
exactly like a repository where nobody pushed.

## Why this file exists

On 2026-09-01 the same infrastructure questions were asked three times in one afternoon, and
every answer already existed in a document nobody had open at that moment. The fix is not
another map: it is putting the answer where the question gets asked. A merge happens here, so
what a merge does belongs here.

## The deploy key, and the failure nobody could have seen

The first webhook-triggered deployment, 2026-09-01 at 15:50:54, failed three seconds in:

```
Error: Permission denied (publickey).
fatal: Could not read from remote repository.
```

**The webhook was fine.** GitHub delivered it and Coolify answered `200`; the deployment
started. What failed was the step before the build: Coolify could not read this repository,
because the private key attached to those two applications was not one this repository knows.

This repository has exactly **one** deploy key, read-only, named `coolify ai-stage (acrobot,
csak olvaso)`. The two staging applications were pointing at a different key. Both were
switched over at 15:57.

**Why this is worth a paragraph rather than a fix and silence:** those applications could
never have deployed themselves, for as long as they have existed. The misconfiguration was not
introduced by the webhooks — it was made visible by them, because until that afternoon nothing
had ever asked those applications to fetch this repository. A wrong setting that nothing
exercises stays invisible indefinitely, and it will surface on the day someone actually needs
the deployment to work.

The same shape appears elsewhere in this codebase's history: a check that cannot fail, a guard
that reports but does not stop, a test that waits for something always present. This was the
infrastructure version of it.
