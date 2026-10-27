import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const sdk = vi.hoisted(() => ({
  auth: { register: vi.fn(), login: vi.fn() },
  store: { customer: { retrieve: vi.fn(), create: vi.fn() } },
  client: { fetch: vi.fn() },
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
  password: "titok12345",
  password_again: "titok12345",
  aszf: "on",
}

beforeEach(() => {
  sdk.client.fetch.mockResolvedValue({ aszf_elfogadas: {} })
  sdk.auth.register.mockResolvedValue("reg-token")
  sdk.auth.login.mockResolvedValue("login-token")
  // Uj vevo: a token meg nincs vevohoz kotve.
  sdk.store.customer.retrieve.mockRejectedValue(new Error("nincs vevo"))
  sdk.store.customer.create.mockResolvedValue({ customer: { id: "cus_1" } })
})
afterEach(() => {
  vi.clearAllMocks()
  delete process.env.NEXT_PUBLIC_FOGYASZTOBARAT_ENABLED
})

/**
 * A REGISZTRACIO ES AZ ASZF-ELFOGADAS (P5; audit A4, vevo-iker). MI PIROSIT: ha
 * pipa nelkul vagy eltero jelszavakkal fiok jon letre; ha a kirakat ismet maga
 * allitja ossze a rekordot (metadata a vevo letrehozasaban, a sutiben), vagy ha
 * a rekordot nem a szerver vegpontja irja a vevohoz kotott tokennel; ha a rekord
 * hibaja kizarja a vevot a belepesbol (vagy ha a sutit eldobja); ha egy masik e-mail sutije masik fiokra irna a pipat.
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
    expect(JSON.stringify(valasz)).not.toContain("titok12345")
  })

  it("sikeres regisztrációnál nincs visszatöltés", async () => {
    const valasz = await signup(null, urlap(JO))
    expect(valasz).toEqual({ state: "success" })
  })

  it("a vevő létrehozása nem visz metaadatot, és a rekordot a szerver írja a vevőhöz kötött tokennel", async () => {
    await signup(null, urlap(JO))

    expect(sdk.store.customer.create).toHaveBeenCalledTimes(1)
    const [adat] = sdk.store.customer.create.mock.calls[0]
    expect(adat).toEqual({
      email: "vevo@example.hu",
      first_name: "Anna",
      last_name: "Minta",
      phone: undefined,
    })
    expect(adat).not.toHaveProperty("metadata")

    // a rekordot a szerver irja, a masodik (vevohoz kotott) bejelentkezes tokenjevel
    expect(sdk.client.fetch).toHaveBeenCalledTimes(1)
    expect(sdk.client.fetch).toHaveBeenCalledWith(
      "/store/customers/me/aszf-elfogadas",
      {
        method: "POST",
        body: { elfogadom: true },
        headers: { authorization: "Bearer login-token" },
      },
    )
    // a kliens sehova nem kuld idopontot, verziot vagy dokumentumot
    expect(JSON.stringify(sdk.client.fetch.mock.calls)).not.toMatch(
      /idopont|verzio|dokumentum|lenyomat/,
    )
    expect(suti.removePendingCustomer).toHaveBeenCalled()
    expect(suti.setAuthToken).toHaveBeenCalledWith("login-token")
  })

  /*
   * AZ E-MAIL-ELLENORZES KITEROJE: ilyenkor a vevo KESOBB jon letre, a sutibol.
   * A sutibe csak a pipa megy (nem rekord), kulonben az ellenorzes utan letrejott
   * vevonek nem lenne mit rogzitenie.
   */
  it("a függő vevő sütijébe csak a pipa kerül, rekord nem", async () => {
    await signup(null, urlap(JO))
    const [fuggo] = suti.setPendingCustomer.mock.calls[0] as [
      Record<string, unknown>,
    ]
    expect(fuggo.aszf).toBe(true)
    expect(fuggo).not.toHaveProperty("metadata")
    expect(JSON.stringify(fuggo)).not.toMatch(/verzio|idopont/)
  })

  /*
   * A BELEPES NEM FUGG A REKORD IRASATOL (barracuda, #608 review): ez a fiokhoz
   * valo hozzaferes, nem rendeles. A kosarnal a megallas helyes, itt kizarna.
   */
  it("ha a szerver nem tudja rögzíteni, a belépés sikerül, a token be van állítva, a süti megmarad", async () => {
    sdk.client.fetch.mockRejectedValue(new Error("boom"))
    const valasz = await signup(null, urlap(JO))
    expect(valasz).toEqual({ state: "success", aszfRogzitesHianyzik: true })
    expect(suti.setAuthToken).toHaveBeenCalledWith("login-token")
    expect(suti.removePendingCustomer).not.toHaveBeenCalled()
  })

  it("a következő belépés megismétli a rögzítést (a vevő már létezik, a süti megvan)", async () => {
    sdk.client.fetch.mockRejectedValueOnce(new Error("boom"))
    await signup(null, urlap(JO))
    // most a vevo mar letezik
    sdk.store.customer.retrieve.mockResolvedValue({ customer: { id: "cus_1" } })
    sdk.client.fetch.mockClear()
    suti.removePendingCustomer.mockClear()
    const valasz = await login(
      null,
      urlap({ email: "vevo@example.hu", password: "titok12345" }),
    )
    expect(valasz).toEqual({ state: "success" })
    expect(sdk.client.fetch).toHaveBeenCalledTimes(1)
    expect(suti.removePendingCustomer).toHaveBeenCalled()
  })

  it("másik e-mail-címhez tartozó süti pipája nem kerül másik fiókra", async () => {
    await signup(null, urlap({ ...JO, email: "mas@example.hu" }))
    // a fuggo suti mas@-hoz tartozik; most egy MASIK vevo lep be, aki mar letezik
    sdk.client.fetch.mockClear()
    suti.removePendingCustomer.mockClear()
    sdk.store.customer.retrieve.mockResolvedValue({ customer: { id: "cus_2" } })
    suti.getPendingCustomer.mockResolvedValueOnce({
      email: "mas@example.hu",
      aszf: true,
    })
    await login(
      null,
      urlap({ email: "masik@example.hu", password: "titok12345" }),
    )
    expect(sdk.client.fetch).not.toHaveBeenCalled()
    expect(suti.removePendingCustomer).not.toHaveBeenCalled()
  })

  it("a régi süti (metaadattal) pipának számít, de a rekordot a szerver írja, a metaadat nem megy tovább", async () => {
    suti.getPendingCustomer.mockResolvedValue({
      email: "vevo@example.hu",
      first_name: "Anna",
      metadata: { aszf_elfogadas: { verzio: "hamis" } },
    })
    await login(
      null,
      urlap({ email: "vevo@example.hu", password: "titok12345" }),
    )
    const [adat] = sdk.store.customer.create.mock.calls[0]
    expect(adat).not.toHaveProperty("metadata")
    expect(sdk.client.fetch).toHaveBeenCalledTimes(1)
  })

  /*
   * BEKAPCSOLT FOGYASZTOBARATNAL A HATTER MEG NEM TUDJA A DOKUMENTUMOT
   * ROGZITENI (a kosar rekordjaval azonos szabaly): a vegpontot nem hivjuk, a
   * megallas hangos.
   */
  it("bekapcsolt Fogyasztóbaráttal nem hívja a végpontot, de a belépés sikerül és a süti marad", async () => {
    process.env.NEXT_PUBLIC_FOGYASZTOBARAT_ENABLED = "true"
    const valasz = await signup(null, urlap(JO))
    expect(valasz).toEqual({ state: "success", aszfRogzitesHianyzik: true })
    expect(sdk.client.fetch).not.toHaveBeenCalled()
    expect(suti.setAuthToken).toHaveBeenCalledWith("login-token")
    expect(suti.removePendingCustomer).not.toHaveBeenCalled()
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
