import { mergeMetadata } from "@medusajs/framework/utils"
import { readFileSync, readdirSync } from "node:fs"
import { dirname, join } from "node:path"

import { POST } from "../../../api/store/customers/me/aszf-elfogadas/route"
import middlewares from "../../../api/middlewares"
import { StorePostAszfElfogadas } from "../../../api/store/carts/[id]/aszf-elfogadas/validators"
import { ASZF_FORRAS_MAI_BOLT, ASZF_VERZIO_MAI_BOLT } from "../aszf-record"
import { saveCustomerAszfAcceptance } from "../customer-aszf-record"

/**
 * THE REGISTRATION'S ÁSZF RECORD IS THE SERVER'S (audit A4, customer twin).
 * What must fail: the time, version or document coming from the request; the
 * customer's other metadata lost in the write; a second call moving the first
 * acceptance to a later time; an unknown customer written to; the route taking
 * more than the customer's word, answering without a customer-bound token, or
 * left without its validator.
 */
const CLAIM = { verzio: "unas-shop-2026-09-29", nyelv: "hu" as const }
const FB_CLAIM = { verzio: "fogyasztobarat-JPNFMVH0", nyelv: "hu" as const }
const NOW = new Date("2026-10-27T18:00:00.000Z")

const fake = (customer: unknown) => {
  const updates: unknown[][] = []
  const container = {
    resolve: () => ({
      retrieveCustomer: async () => {
        if (!customer) throw new Error("not found")
        return customer
      },
      updateCustomers: async (...args: unknown[]) => void updates.push(args),
    }),
  }
  return { container: container as never, updates }
}

afterEach(() => {
  delete process.env.FOGYASZTOBARAT_ENABLED
  delete process.env.FOGYASZTOBARAT_ID_HU
})

describe("saveCustomerAszfAcceptance", () => {
  it("writes the server's clock, version and document and keeps the other keys", async () => {
    const { container, updates } = fake({ id: "cus_1", metadata: { other: "kept" } })
    const result = await saveCustomerAszfAcceptance(container, "cus_1", CLAIM, NOW)
    const record = { idopont: NOW.toISOString(), verzio: ASZF_VERZIO_MAI_BOLT, dokumentum: ASZF_FORRAS_MAI_BOLT, nyelv: "hu" }
    expect(result).toEqual({ status: "saved", record })
    // only the own key is sent; Medusa merges it into the customer's metadata (the other key stays)
    expect(updates).toEqual([["cus_1", { metadata: { aszf_elfogadas: record } }]])
    const sent = (updates[0]![1] as { metadata: Record<string, unknown> }).metadata
    expect(mergeMetadata({ other: "kept" }, sent)).toEqual({ other: "kept", aszf_elfogadas: record })
  })

  // the premise of sending only the own key, for the CUSTOMER: the module hands the update to a generic service (it has no service of
  // its own besides the module), which merges the incoming metadata into the customer's own. An upgrade that changes this turns it red.
  it("the installed Medusa's customer update goes through the generic, merging service", () => {
    const entry = require.resolve("@medusajs/customer", { paths: [dirname(require.resolve("@medusajs/medusa/package.json"))] })
    const services = join(dirname(entry), "services")
    expect(readdirSync(services).filter((f) => f.endsWith(".js") && f !== "index.js")).toEqual(["customer-module.js"])
    expect(readFileSync(join(services, "customer-module.js"), "utf8")).toMatch(/this\.customerService_\.update\(updateData, sharedContext\)/)
  })

  it("writes on a customer with no metadata at all", async () => {
    const { container, updates } = fake({ id: "cus_1", metadata: null })
    expect((await saveCustomerAszfAcceptance(container, "cus_1", CLAIM, NOW)).status).toBe("saved")
    expect(updates).toHaveLength(1)
  })

  it("a second call returns the first record and writes nothing", async () => {
    const first = { idopont: "2026-10-01T08:00:00.000Z", verzio: "v", dokumentum: "d" }
    const { container, updates } = fake({ id: "cus_1", metadata: { aszf_elfogadas: first } })
    expect(await saveCustomerAszfAcceptance(container, "cus_1", CLAIM, NOW)).toEqual({ status: "already", record: first })
    expect(updates).toEqual([])
  })

  it("an unknown customer: not_found, nothing written", async () => {
    const { container, updates } = fake(null)
    expect(await saveCustomerAszfAcceptance(container, "cus_x", CLAIM, NOW)).toEqual({ status: "not_found" })
    expect(updates).toEqual([])
  })

  it("with the Fogyasztóbarát switch on it records that document, with its date and hash", async () => {
    process.env.FOGYASZTOBARAT_ENABLED = "true"
    const { container, updates } = fake({ id: "cus_1", metadata: {} })
    const fetcher = (async () =>
      new Response("<p>hatályos ettől a naptól: <span>2026-10-05</span></p>")) as unknown as typeof fetch
    const result = await saveCustomerAszfAcceptance(container, "cus_1", FB_CLAIM, NOW, fetcher)
    expect(result.status).toBe("saved")
    const record = (updates[0][1] as { metadata: { aszf_elfogadas: Record<string, unknown> } }).metadata.aszf_elfogadas
    expect(record).toMatchObject({ verzio: "fogyasztobarat-JPNFMVH0", hatalyos: "2026-10-05" })
    expect(String(record.lenyomat)).toMatch(/^sha256:[0-9a-f]{64}$/)
  })

  it("with the switch on and no Hungarian shop id there is no document to name: nothing written", async () => {
    process.env.FOGYASZTOBARAT_ENABLED = "true"
    process.env.FOGYASZTOBARAT_ID_HU = ""
    const { container, updates } = fake({ id: "cus_1", metadata: {} })
    expect(await saveCustomerAszfAcceptance(container, "cus_1", FB_CLAIM, NOW)).toEqual({ status: "not_configured" })
    expect(updates).toEqual([])
  })
})

describe("the claim of what the shop showed", () => {
  it("backend on, the shop showed the old shop's ÁSZF: refused, nothing written (registration too)", async () => {
    process.env.FOGYASZTOBARAT_ENABLED = "true"
    const { container, updates } = fake({ id: "cus_1", metadata: {} })
    expect(await saveCustomerAszfAcceptance(container, "cus_1", CLAIM, NOW, (async () => new Response("x")) as unknown as typeof fetch)).toEqual({
      status: "version_mismatch",
    })
    expect(updates).toEqual([])
  })

  it("an English acceptance is refused: no record names the English document yet", async () => {
    const { container, updates } = fake({ id: "cus_1", metadata: {} })
    expect(await saveCustomerAszfAcceptance(container, "cus_1", { ...CLAIM, nyelv: "en" }, NOW)).toEqual({
      status: "language_unsupported",
    })
    expect(updates).toEqual([])
  })
})

describe("POST /store/customers/me/aszf-elfogadas", () => {
  const call = async (actorId: string | undefined, customer: unknown) => {
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() }
    await POST(
      {
        scope: fake(customer).container,
        auth_context: { actor_id: actorId },
        validatedBody: { elfogadom: true, megjelenitett_verzio: "unas-shop-2026-09-29", nyelv: "hu" },
      } as never,
      res as never
    )
    return res
  }

  it("401 without a customer-bound token, and nothing is looked up", async () => {
    const res = await call(undefined, { id: "cus_1", metadata: {} })
    expect(res.status).toHaveBeenCalledWith(401)
  })

  it("answers the record it saved, for the token's own customer", async () => {
    const res = await call("cus_1", { id: "cus_1", metadata: {} })
    const body = res.json.mock.calls[0][0]
    expect(body.aszf_elfogadas.verzio).toBe(ASZF_VERZIO_MAI_BOLT)
  })

  it("404 for a customer that does not exist, 503 with the switch on and no Hungarian shop id", async () => {
    expect((await call("cus_x", null)).status).toHaveBeenCalledWith(404)
    process.env.FOGYASZTOBARAT_ENABLED = "true"
    process.env.FOGYASZTOBARAT_ID_HU = ""
    expect((await call("cus_1", { id: "cus_1", metadata: {} })).status).toHaveBeenCalledWith(503)
  })

  it("takes the customer's word and nothing else: the body is strict and the route has its validator", () => {
    const ok = { elfogadom: true, megjelenitett_verzio: "v", nyelv: "hu" }
    expect(StorePostAszfElfogadas.safeParse(ok).success).toBe(true)
    for (const body of [{}, { elfogadom: true }, { elfogadom: false }, { ...ok, idopont: "2020-01-01", verzio: "x" }])
      expect(StorePostAszfElfogadas.safeParse(body).success).toBe(false)
    const guarded = middlewares.routes?.find(
      (r) =>
        r.matcher === "/store/customers/me/aszf-elfogadas" &&
        ((r as { methods?: string[] }).methods ?? []).includes("POST")
    )
    expect(guarded?.middlewares?.length).toBe(1)
  })
})
