import { MedusaError, Modules } from "@medusajs/framework/utils"

import middlewares from "../../../../../middlewares"
import { POST } from "../route"
import { StoreChangePassword } from "../validators"

/**
 * A CUSTOMER CHANGES ONLY THEIR OWN PASSWORD, AND ONLY WITH THE CURRENT ONE.
 *
 * The auth module is faked the way it answers: two password identities, each
 * with its own email and password. What must fail: a wrong current password
 * writes nothing; the identity comes from the SESSION, never from the body; a
 * successful check for another identity writes nothing.
 */

type Identity = { authId: string; email: string; password: string }

const IDENTITIES: Identity[] = [
  { authId: "authid_a", email: "a@example.hu", password: "regi-a" },
  { authId: "authid_b", email: "b@example.hu", password: "regi-b" },
]

function request(
  authIdentityId: string | undefined,
  body: { current_password: string; new_password: string },
  options: { checkReturnsId?: string; updateFails?: boolean } = {},
) {
  const updates: unknown[] = []
  const checked: unknown[] = []
  const auth = {
    listProviderIdentities: async (filter: {
      auth_identity_id: string
      provider: string
    }) =>
      IDENTITIES.filter(
        (i) =>
          i.authId === filter.auth_identity_id &&
          filter.provider === "emailpass",
      ).map((i) => ({ entity_id: i.email, auth_identity_id: i.authId })),
    authenticate: async (
      provider: string,
      data: { body: { email: string; password: string } },
    ) => {
      checked.push({ provider, ...data.body })
      const found = IDENTITIES.find(
        (i) => i.email === data.body.email && i.password === data.body.password,
      )
      if (!found) return { success: false, error: "Invalid email or password" }
      return {
        success: true,
        authIdentity: { id: options.checkReturnsId ?? found.authId },
      }
    },
    updateProvider: async (provider: string, data: unknown) => {
      if (options.updateFails) return { success: false, error: "db down" }
      updates.push({ provider, data })
      return { success: true, authIdentity: {} }
    },
  }
  const req = {
    auth_context: authIdentityId
      ? { actor_id: "cus_x", auth_identity_id: authIdentityId }
      : undefined,
    validatedBody: body,
    scope: {
      resolve: (key: string) => {
        if (key === Modules.AUTH) return auth
        throw new Error(`unexpected resolve ${key}`)
      },
    },
  }
  const res = {
    body: undefined as unknown,
    json(b: unknown) {
      this.body = b
    },
  }
  return { req, res, updates, checked }
}

const run = async (...args: Parameters<typeof request>) => {
  const call = request(...args)
  const error = await POST(call.req as never, call.res as never).then(
    () => null,
    (e: MedusaError) => e,
  )
  return { ...call, error }
}

describe("POST /store/customers/me/password", () => {
  it("changes the password when the current one is right", async () => {
    const { res, updates, checked, error } = await run("authid_a", {
      current_password: "regi-a",
      new_password: "uj-jelszo",
    })
    expect(error).toBeNull()
    expect(res.body).toEqual({ success: true })
    expect(checked).toEqual([
      { provider: "emailpass", email: "a@example.hu", password: "regi-a" },
    ])
    expect(updates).toEqual([
      {
        provider: "emailpass",
        data: { entity_id: "a@example.hu", password: "uj-jelszo" },
      },
    ])
  })

  it("B's session changes B's password, not the first identity found", async () => {
    const { updates, error } = await run("authid_b", {
      current_password: "regi-b",
      new_password: "uj-jelszo",
    })
    expect(error).toBeNull()
    expect(updates).toEqual([
      {
        provider: "emailpass",
        data: { entity_id: "b@example.hu", password: "uj-jelszo" },
      },
    ])
  })

  it("refuses a wrong current password with 400 and writes nothing", async () => {
    const { res, updates, error } = await run("authid_a", {
      current_password: "rossz",
      new_password: "uj-jelszo",
    })
    expect(error?.type).toBe(MedusaError.Types.INVALID_DATA)
    expect(res.body).toBeUndefined()
    expect(updates).toEqual([])
  })

  it("checks the session's own identity: B's password does not open A's account", async () => {
    const { updates, checked, error } = await run("authid_a", {
      current_password: "regi-b",
      new_password: "uj-jelszo",
    })
    expect(error?.type).toBe(MedusaError.Types.INVALID_DATA)
    expect(checked).toEqual([
      { provider: "emailpass", email: "a@example.hu", password: "regi-b" },
    ])
    expect(updates).toEqual([])
  })

  it("writes nothing when the check succeeds for another identity", async () => {
    const { updates, error } = await run(
      "authid_a",
      { current_password: "regi-a", new_password: "uj-jelszo" },
      { checkReturnsId: "authid_b" },
    )
    expect(error?.type).toBe(MedusaError.Types.INVALID_DATA)
    expect(updates).toEqual([])
  })

  it("refuses an account with no password sign-in", async () => {
    const { updates, checked, error } = await run("authid_nincs", {
      current_password: "regi-a",
      new_password: "uj-jelszo",
    })
    expect(error?.type).toBe(MedusaError.Types.NOT_ALLOWED)
    expect(checked).toEqual([])
    expect(updates).toEqual([])
  })

  it("refuses a request without a session", async () => {
    const { updates, error } = await run(undefined, {
      current_password: "regi-a",
      new_password: "uj-jelszo",
    })
    expect(error?.type).toBe(MedusaError.Types.UNAUTHORIZED)
    expect(updates).toEqual([])
  })

  it("reports a failed update instead of answering success", async () => {
    const { res, error } = await run(
      "authid_a",
      { current_password: "regi-a", new_password: "uj-jelszo" },
      { updateFails: true },
    )
    expect(error?.type).toBe(MedusaError.Types.UNEXPECTED_STATE)
    expect(res.body).toBeUndefined()
  })
})

describe("the body of the password change", () => {
  it("needs both passwords, non-empty", () => {
    expect(
      StoreChangePassword.safeParse({ current_password: "a", new_password: "b" })
        .success,
    ).toBe(true)
    expect(
      StoreChangePassword.safeParse({ current_password: "", new_password: "b" })
        .success,
    ).toBe(false)
    expect(
      StoreChangePassword.safeParse({ current_password: "a", new_password: "" })
        .success,
    ).toBe(false)
  })

  it("takes no email: the identity comes from the session", () => {
    expect(
      StoreChangePassword.safeParse({
        current_password: "a",
        new_password: "b",
        email: "b@example.hu",
      }).success,
    ).toBe(false)
  })

  it("is validated on this route", () => {
    // defineMiddlewares turns `method` into `methods`
    const route = middlewares.routes?.find(
      (r) =>
        r.matcher === "/store/customers/me/password" &&
        (r as { methods?: string[] }).methods?.includes("POST"),
    )
    expect(route?.middlewares).toHaveLength(1)
  })
})
