import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const sdk = vi.hoisted(() => ({
  auth: { register: vi.fn(), login: vi.fn() },
  store: { customer: { retrieve: vi.fn(), create: vi.fn() } },
}))
vi.mock("@lib/config", () => ({ sdk }))
const suti = vi.hoisted(() => {
  let fuggo: unknown = null
  return {
    setPendingCustomer: vi.fn(async (c: unknown) => {
      fuggo = c
    }),
    getPendingCustomer: vi.fn(async () => fuggo),
    removePendingCustomer: vi.fn(async () => {
      fuggo = null
    }),
    setAuthToken: vi.fn(),
    removeAuthToken: vi.fn(),
    getAuthHeaders: vi.fn(async () => ({})),
    getCacheOptions: vi.fn(async () => ({})),
    getCacheTag: vi.fn(async () => "customers"),
    getCartId: vi.fn(async () => null),
    removeCartId: vi.fn(),
  }
})
vi.mock("./cookies", () => suti)
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }))
vi.mock("next/navigation", () => ({ redirect: vi.fn() }))

import { ASZF_CIM, ASZF_METADATA_KULCS, ASZF_VERZIO } from "@lib/util/aszf"

import { login, signup } from "./customer"

const urlap = (mezok: Record<string, string>) => {
  const fd = new FormData()
  for (const [k, v] of Object.entries(mezok)) fd.set(k, v)
  return fd
}
const JO = {
  email: "vevo@example.hu",
  first_name: "Anna",
  last_name: "Minta",
  password: "titok123",
  password_again: "titok123",
  aszf: "on",
}

beforeEach(() => {
  sdk.auth.register.mockResolvedValue("reg-token")
  sdk.auth.login.mockResolvedValue("login-token")
  // Uj vevo: a token meg nincs vevohoz kotve.
  sdk.store.customer.retrieve.mockRejectedValue(new Error("nincs vevo"))
  sdk.store.customer.create.mockResolvedValue({ customer: { id: "cus_1" } })
})
afterEach(() => {
  vi.clearAllMocks()
})

/**
 * A REGISZTRACIO ES AZ ASZF-ELFOGADAS (P5). MI PIROSIT: ha pipa nelkul vagy
 * eltero jelszavakkal fiok jon letre; ha az elfogadas nem jut el a vevo
 * metadata mezojeig, vagy nem az idopontot, a verziot es a dokumentumot viszi.
 */
describe("a regisztráció az ÁSZF-elfogadással", () => {
  it("pipa nélkül nem hoz létre fiókot", async () => {
    const valasz = await signup(null, urlap({ ...JO, aszf: "" }))
    expect(valasz?.state).toBe("error")
    expect(sdk.auth.register).not.toHaveBeenCalled()
    expect(sdk.store.customer.create).not.toHaveBeenCalled()
  })

  it("eltérő jelszavakkal nem hoz létre fiókot", async () => {
    const valasz = await signup(null, urlap({ ...JO, password_again: "masik" }))
    expect(valasz).toEqual({
      state: "error",
      error: "A két jelszó nem egyezik.",
      ertekek: {
        last_name: "Minta",
        first_name: "Anna",
        email: "vevo@example.hu",
        aszf: "on",
      },
    })
    expect(sdk.auth.register).not.toHaveBeenCalled()
  })

  /*
   * A HIBA A BEIRT ERTEKEKET VISSZAADJA (a React 19 az action utan alaphelyzetbe
   * allitja az urlapot, es ezekbol toltodik vissza), a JELSZAVAKAT NEM. A
   * szerver hibaja (letezo fiok) is, nem csak az ellenorzese.
   */
  it("a szerver hibájánál is visszaadja a beírt értékeket, a jelszavakat nem", async () => {
    sdk.auth.register.mockRejectedValue(new Error("Something broke"))
    const valasz = await signup(null, urlap(JO))
    expect(valasz).toMatchObject({
      state: "error",
      ertekek: {
        last_name: "Minta",
        first_name: "Anna",
        email: "vevo@example.hu",
        aszf: "on",
      },
    })
    expect(JSON.stringify(valasz)).not.toContain("titok123")
  })

  it("sikeres regisztrációnál nincs visszatöltés", async () => {
    const valasz = await signup(null, urlap(JO))
    expect(valasz).toEqual({ state: "success" })
  })

  it("az elfogadás időbélyeggel és verzióval a vevő metadata mezőjébe kerül", async () => {
    const elotte = Date.now()
    await signup(null, urlap(JO))

    expect(sdk.store.customer.create).toHaveBeenCalledTimes(1)
    const [adat] = sdk.store.customer.create.mock.calls[0]
    const elfogadas = adat.metadata[ASZF_METADATA_KULCS]
    expect(elfogadas.verzio).toBe(ASZF_VERZIO)
    expect(elfogadas.dokumentum).toBe(ASZF_CIM)
    const ido = Date.parse(elfogadas.idopont)
    expect(ido).toBeGreaterThanOrEqual(elotte - 1000)
    expect(ido).toBeLessThanOrEqual(Date.now())
    expect(adat).toMatchObject({
      email: "vevo@example.hu",
      first_name: "Anna",
      last_name: "Minta",
    })
  })

  /*
   * AZ E-MAIL-ELLENORZES KITEROJE: ilyenkor a vevo KESOBB jon letre, a sutibol.
   * Az elfogadasnak a sutiben is ott kell lennie, kulonben az ellenorzes utan
   * letrejott vevonek nincs rekordja.
   */
  it("az elfogadás a függő vevő sütijébe is bekerül", async () => {
    await signup(null, urlap(JO))
    const [fuggo] = suti.setPendingCustomer.mock.calls[0] as [
      { metadata: Record<string, { verzio: string }> },
    ]
    expect(fuggo.metadata[ASZF_METADATA_KULCS].verzio).toBe(ASZF_VERZIO)
  })
})

/*
 * A BELEPES HIBAAGA (a P5-1 kalibraciojabol): a lekepezot visszaforditva
 * (`String(error)`) minden allitas zold maradt, mert egyik sem futtatta a
 * belepes elbukott agat. A stage-en mert szoveggel all itt.
 */
describe("a belépés hibája a vevő felé", () => {
  it("rossz jelszónál magyar mondat, nem a szerver angol szövege", async () => {
    sdk.auth.login.mockRejectedValue(new Error("Invalid email or password"))
    const valasz = await login(
      null,
      urlap({ email: "vevo@example.hu", password: "rossz" }),
    )
    expect(valasz).toEqual({
      state: "error",
      error: "Hibás e-mail-cím vagy jelszó.",
      ertekek: { email: "vevo@example.hu" },
    })
    expect(JSON.stringify(valasz)).not.toContain("rossz")
  })
})
