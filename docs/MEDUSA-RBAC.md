# Medusa's role-based access control, and why it is not protecting anything today

Measured in `@medusajs/medusa` 2.19.0 and `@medusajs/framework` as vendored in this
repository, 2026-08-26. Everything below was read from the shipped code rather than
from documentation, and the file paths are given so it can be checked again after an
upgrade.

## The short version

Medusa lets a route declare a policy. **That declaration does nothing unless a feature
flag is on, and the flag is off by default.** A route wrapped in a policy check looks
guarded in the source and is not guarded at runtime, and nothing anywhere says so - no
warning at boot, no error, no log line.

We do not declare any policy today, so nothing is currently mis-protected. This page
exists for the next person who writes one.

## What was measured

**The flag.** `node_modules/@medusajs/medusa/dist/feature-flags/rbac.js`:

```js
{ key: "rbac", default_val: false, env_key: "MEDUSA_FF_RBAC", ... }
```

A second flag, `rbac_filter_fields` (`MEDUSA_FF_RBAC_FILTER_FIELDS`), governs
field-level filtering by role and is also off by default.

**Our configuration.** `apps/backend/medusa-config.ts` declares no `featureFlags`
section, so both run on their defaults. Off.

**What the check does when the flag is off.**
`@medusajs/framework/dist/policies/has-permission.js`:

```js
const isDisabled = !ffRouter.isFeatureEnabled("rbac");
if (isDisabled || !roleIds?.length || !actionList?.length) {
  return true;
}
```

It returns **true**. Not "skip", not "deny": permitted.

## The part that is easy to get wrong

"Flag off" does **not** mean "everyone gets in". The middleware that calls the check
runs one test of its own first, in
`@medusajs/framework/dist/http/middlewares/check-permissions.js`:

```js
const roleIds = authContext?.app_metadata?.roles || [];
if (!roleIds.length) {
  throw new MedusaError(MedusaError.Types.FORBIDDEN, "Forbidden");
}
```

So with the flag off, a declared policy behaves like this:

| The caller              | Result                                |
| ----------------------- | ------------------------------------- |
| has no role at all      | **403 Forbidden**                     |
| has any role whatsoever | **allowed, whatever the policy said** |

That combination is worse than either extreme for the person testing it. A route
protected by a `product:delete` policy will correctly refuse a roleless caller, which
looks exactly like the policy working - and will then let a role holder with no such
permission delete the product. A check that passes the first test you think to run and
fails the one you do not is the shape that ships.

## What this means for us

- **Do not declare a policy and consider the route protected.** Either turn the flag on
  and prove the denial with a test, or protect the route by other means.
- **Turning the flag on is not a free switch.** It makes every declared policy live at
  once, including any written earlier under the assumption that they were decorative,
  and it needs roles and policies to exist in the database for the people who are
  already working. Do it deliberately, not as a line in a deploy.
- **Our own admin surface is not this mechanism.** Acropora OS has its own permission
  model (`packages/types/src/auth.ts` in the OS repository), and that one is enforced
  by a global guard rather than by a flag. Nothing here changes it.

## What would reopen this page

An upgrade of `@medusajs/medusa`. `default_val` is a value in a shipped file, and it is
exactly the kind of default that flips in a minor release without anybody reading the
line. If a future version turns it on, every policy declared here starts denying
requests on the day of the upgrade - which is the desirable direction, and still a
change that should not arrive as a surprise.
