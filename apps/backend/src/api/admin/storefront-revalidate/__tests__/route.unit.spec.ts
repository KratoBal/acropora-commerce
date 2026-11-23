import { resetRevalidateMemory } from "../../../../workflows/utils/storefront-revalidate"
import { GET, POST } from "../route"
import { AdminStorefrontRevalidate } from "../validators"

/*
  THE REVALIDATION'S ADMIN ENDPOINTS (card 54bb3779, A4). WHAT TURNS THIS RED: GET leaks the secret or answers without the
  status; POST calls an unconfigured revalidation (or does not say so: 409); a refused or failed call answers 200; the manual
  call goes to another tag than the one asked (or to none by default), or by another path than the subscribers' (so its result is
  not the status row); the schema takes an unknown tag, an empty list or an extra key.
*/
const resWith = () => {
  const out: { status?: number; body?: Record<string, any> } = {}
  const res = {
    status(code: number) {
      out.status = code
      return res
    },
    json(body: Record<string, any>) {
      out.body = body
      return res
    },
  }
  return { out, res: res as never }
}
const reqWith = (body?: unknown) => ({ scope: { resolve: () => ({ info: jest.fn(), warn: jest.fn() }) }, validatedBody: body }) as never

let saved: NodeJS.ProcessEnv
beforeEach(() => {
  saved = { ...process.env }
  resetRevalidateMemory()
  delete process.env.ACROPORA_STOREFRONT_URL
  delete process.env.STOREFRONT_REVALIDATE_URL
  delete process.env.STOREFRONT_REVALIDATE_SECRET
})
afterEach(() => {
  process.env = saved
  jest.restoreAllMocks()
})
const configure = () => {
  process.env.STOREFRONT_REVALIDATE_URL = "http://storefront-internal:8000/x"
  process.env.STOREFRONT_REVALIDATE_SECRET = "titok-123"
}

describe("GET", () => {
  it("answers the status, without the secret or the path", async () => {
    configure()
    const { out, res } = resWith()
    await GET(reqWith(), res)
    expect(out.body?.storefront_revalidate).toMatchObject({ configured: true, target_host: "storefront-internal:8000", secret_set: true })
    expect(JSON.stringify(out.body)).not.toContain("titok-123")
    expect(JSON.stringify(out.body)).not.toContain("/x")
  })
})

describe("POST", () => {
  it("unconfigured: 409 with the status, and no call", async () => {
    const fetchSpy = jest.spyOn(globalThis, "fetch")
    const { out, res } = resWith()
    await POST(reqWith({}), res)
    expect(out.status).toBe(409)
    expect(out.body?.storefront_revalidate.configured).toBe(false)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("empties the products tag by default, by the subscribers' path, and answers the status row with the manual trigger", async () => {
    configure()
    const fetchSpy = jest.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true, status: 200 } as never)
    const { out, res } = resWith()
    await POST(reqWith({}), res)
    expect(out.status).toBe(200)
    const [url, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe("http://storefront-internal:8000/x/api/revalidate")
    expect(JSON.parse(String(init.body))).toEqual({ tags: ["products"] })
    expect((init.headers as Record<string, string>)["x-revalidate-secret"]).toBe("titok-123")
    expect(out.body).toMatchObject({ ok: true })
    expect(out.body?.storefront_revalidate.last_attempt).toMatchObject({ trigger: "manual", tags: ["products"], ok: true, http_status: 200 })
  })

  it("empties the tags it was asked to", async () => {
    configure()
    const fetchSpy = jest.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true, status: 200 } as never)
    await POST(reqWith({ tags: ["brands", "redirects"] }), resWith().res)
    const [, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit]
    expect(JSON.parse(String(init.body))).toEqual({ tags: ["brands", "redirects"] })
  })

  it("a refusal answers 502 with the HTTP status, a failed call with the error and its cause", async () => {
    configure()
    jest.spyOn(globalThis, "fetch").mockResolvedValueOnce({ ok: false, status: 401 } as never)
    const refused = resWith()
    await POST(reqWith({}), refused.res)
    expect(refused.out.status).toBe(502)
    expect(refused.out.body).toMatchObject({ ok: false })
    expect(refused.out.body?.storefront_revalidate.last_attempt).toMatchObject({ ok: false, http_status: 401 })

    jest.spyOn(globalThis, "fetch").mockRejectedValueOnce(Object.assign(new Error("fetch failed"), { cause: { code: "ENOTFOUND" } }))
    const failed = resWith()
    await POST(reqWith({}), failed.res)
    expect(failed.out.status).toBe(502)
    expect(failed.out.body?.storefront_revalidate.last_attempt).toMatchObject({ ok: false, http_status: null, error: "fetch failed (ENOTFOUND)" })
  })
})

describe("the request schema", () => {
  it("takes no body, or known tags; refuses an unknown tag, an empty list and an extra key", () => {
    expect(AdminStorefrontRevalidate.safeParse({}).success).toBe(true)
    expect(AdminStorefrontRevalidate.safeParse({ tags: ["products", "brands"] }).success).toBe(true)
    expect(AdminStorefrontRevalidate.safeParse({ tags: ["everything"] }).success).toBe(false)
    expect(AdminStorefrontRevalidate.safeParse({ tags: [] }).success).toBe(false)
    expect(AdminStorefrontRevalidate.safeParse({ tags: ["products"], path: "/" }).success).toBe(false)
  })
})
