import { describe, expect, it, vi } from "vitest"

import { sebessegKorlat } from "@lib/util/hirlevel-feliratkozas"
import {
  VISSZAALLITO_TOKEN,
  jelszoVisszaallitasKeres,
  ujJelszoBeallit,
} from "@lib/util/jelszo-visszaallitas"

/*
  MI PIROSIT (kartya 7bfca4eb): a keres valasza elarulja, van-e fiok a cimen (a bolt es a kirakat is ugyanazt mondja); egy ervenytelen
  cimmel is megy a keres; a latogatonkenti korlat nem fog; a bolt 429-e altalanos hibava valik; a keres nyelve nem a bolthoz megy; az uj
  jelszo URES, ELTERO vagy ROVID jelszoval mar a bolthoz megy; egy nem token alaku szoveg a bolthoz megy; a lejart, felhasznalt vagy hamis
  token (401) nem a "ervenytelen link" kodot adja; a token vagy a jelszo bekerul a hibaallapotba (az urlap visszatoltene).
*/
const kulcs = () => sebessegKorlat({ max: 5, ablakMs: 10 * 60 * 1000 })
const hiba = (status: number) => Object.assign(new Error("x"), { status })

describe("jelszoVisszaallitasKeres", () => {
  it("a keres a cimet kisbetuvel, a nyelvvel egyutt viszi a bolthoz, es a valasz altalanos siker", async () => {
    const kuld = vi.fn().mockResolvedValue("Created")
    const eredmeny = await jelszoVisszaallitasKeres(
      { email: "  Vevo@Example.hu ", ip: "1.2.3.4", nyelv: "en" },
      { korlat: kulcs(), kuld },
    )
    expect(eredmeny).toEqual({ state: "success" })
    expect(kuld).toHaveBeenCalledWith({
      identifier: "vevo@example.hu",
      metadata: { locale: "en" },
    })
  })

  it("nyelv nelkul magyar", async () => {
    const kuld = vi.fn().mockResolvedValue(undefined)
    await jelszoVisszaallitasKeres(
      { email: "vevo@example.hu", ip: "ip" },
      { korlat: kulcs(), kuld },
    )
    expect(kuld.mock.calls[0][0].metadata).toEqual({ locale: "hu" })
  })

  it("ervenytelen cimmel nem megy a keres, es a beirt cim visszakerul az urlapra", async () => {
    for (const email of [
      "",
      "   ",
      "nincs-kukac",
      "a@b",
      "x".repeat(250) + "@example.hu",
    ]) {
      const kuld = vi.fn()
      const eredmeny = await jelszoVisszaallitasKeres(
        { email, ip: "ip" },
        { korlat: kulcs(), kuld },
      )
      expect([email, eredmeny.state === "error" && eredmeny.error]).toEqual([
        email,
        "email_invalid",
      ])
      expect(kuld).not.toHaveBeenCalled()
    }
    const eredmeny = await jelszoVisszaallitasKeres(
      { email: " rossz ", ip: "ip" },
      { korlat: kulcs(), kuld: vi.fn() },
    )
    expect(eredmeny).toEqual({
      state: "error",
      error: "email_invalid",
      ertekek: { email: "rossz" },
    })
  })

  it("a latogatonkenti korlat az hatodik keresnel fog, es a bolthoz sem megy", async () => {
    const korlat = kulcs()
    const kuld = vi.fn().mockResolvedValue("Created")
    for (let i = 0; i < 5; i++)
      await jelszoVisszaallitasKeres(
        { email: `v${i}@example.hu`, ip: "ugyanaz" },
        { korlat, kuld },
      )
    const hatodik = await jelszoVisszaallitasKeres(
      { email: "v6@example.hu", ip: "ugyanaz" },
      { korlat, kuld },
    )
    expect(hatodik).toMatchObject({
      state: "error",
      error: "too_many_attempts",
    })
    expect(kuld).toHaveBeenCalledTimes(5)
    // mas latogato szabad
    expect(
      (
        await jelszoVisszaallitasKeres(
          { email: "v7@example.hu", ip: "masik" },
          { korlat, kuld },
        )
      ).state,
    ).toBe("success")
  })

  it("a bolt 429-e es minden mas hiba kodot ad, a nyers szoveg nem megy ki", async () => {
    const korlat = kulcs()
    const a = await jelszoVisszaallitasKeres(
      { email: "a@example.hu", ip: "1" },
      { korlat, kuld: vi.fn().mockRejectedValue(hiba(429)) },
    )
    expect(a).toMatchObject({ state: "error", error: "too_many_attempts" })
    const b = await jelszoVisszaallitasKeres(
      { email: "b@example.hu", ip: "2" },
      { korlat, kuld: vi.fn().mockRejectedValue(new Error("boom")) },
    )
    expect(b).toMatchObject({ state: "error", error: "generic" })
  })
})

const TOKEN =
  "eyJhbGciOiJIUzI1NiJ9.eyJlbnRpdHlfaWQiOiJ2In0.c2lnbmF0dXJlLTEyMzQ1Ng"
const jo = {
  token: TOKEN,
  jelszo: "Eleg-hosszu-jelszo",
  jelszoUjra: "Eleg-hosszu-jelszo",
}

describe("ujJelszoBeallit", () => {
  it("jo bemenettel a tokent es CSAK a jelszot viszi a bolthoz", async () => {
    const kuld = vi.fn().mockResolvedValue({ success: true })
    expect(await ujJelszoBeallit(jo, { kuld })).toEqual({ state: "success" })
    expect(kuld).toHaveBeenCalledWith({
      token: TOKEN,
      password: "Eleg-hosszu-jelszo",
    })
  })

  it("ures mezo, eltero jelszo es rovid jelszo (tiz karakter alatt, akcentussal is karakterkent) a bolthoz sem megy", async () => {
    const kuld = vi.fn()
    const kodok: Record<string, unknown> = {
      ures: await ujJelszoBeallit({ ...jo, jelszo: "" }, { kuld }),
      eltero: await ujJelszoBeallit(
        { ...jo, jelszoUjra: "Mas-jelszo-xyz" },
        { kuld },
      ),
      rovid: await ujJelszoBeallit(
        { ...jo, jelszo: "rovid", jelszoUjra: "rovid" },
        { kuld },
      ),
      kilenc: await ujJelszoBeallit(
        { ...jo, jelszo: "árvíztűrő", jelszoUjra: "árvíztűrő" },
        { kuld },
      ),
    }
    expect(kodok).toEqual({
      ures: { state: "error", error: "reset_fields_required" },
      eltero: { state: "error", error: "passwords_differ" },
      rovid: { state: "error", error: "password_short" },
      kilenc: { state: "error", error: "password_short" },
    })
    expect(kuld).not.toHaveBeenCalled()
    // tiz karakter akcentussal: atmegy
    expect(
      (
        await ujJelszoBeallit(
          { ...jo, jelszo: "árvíztűrők", jelszoUjra: "árvíztűrők" },
          { kuld: vi.fn().mockResolvedValue({}) },
        )
      ).state,
    ).toBe("success")
  })

  it("nem token alaku szoveg (hianyzo, rovid, ket reszes, idegen karakter) a bolthoz sem megy: ervenytelen link", async () => {
    for (const token of [
      "",
      "abc",
      "a.b",
      "x.y.z",
      "aaaaaaaa.bbbbbbbb.cccccccc dd",
      "aaaaaaaa.bbbbbbbb.cccccccc/../x",
    ]) {
      const kuld = vi.fn()
      expect([
        token,
        await ujJelszoBeallit({ ...jo, token }, { kuld }),
      ]).toEqual([token, { state: "error", error: "reset_link_invalid" }])
      expect(kuld).not.toHaveBeenCalled()
    }
    expect(VISSZAALLITO_TOKEN.test(TOKEN)).toBe(true)
  })

  it("a lejart, a felhasznalt es a hamis token (401, 403) egy kod: ervenytelen link; a 429 es a 400 sajat kodot kap; a tobbi altalanos", async () => {
    const kod = async (e: unknown) =>
      await ujJelszoBeallit(jo, { kuld: vi.fn().mockRejectedValue(e) })
    expect(await kod(hiba(401))).toEqual({
      state: "error",
      error: "reset_link_invalid",
    })
    expect(await kod(hiba(403))).toEqual({
      state: "error",
      error: "reset_link_invalid",
    })
    expect(await kod(hiba(429))).toEqual({
      state: "error",
      error: "too_many_attempts",
    })
    expect(await kod(hiba(400))).toEqual({
      state: "error",
      error: "password_short",
    })
    expect(await kod(hiba(500))).toEqual({ state: "error", error: "generic" })
    expect(await kod(new Error("boom"))).toEqual({
      state: "error",
      error: "generic",
    })
  })

  it("a hibaallapotban nincs token es nincs jelszo (az urlapra semmi nem tolt vissza)", async () => {
    const eredmeny = await ujJelszoBeallit(jo, {
      kuld: vi.fn().mockRejectedValue(hiba(401)),
    })
    expect(JSON.stringify(eredmeny)).not.toContain(TOKEN)
    expect(JSON.stringify(eredmeny)).not.toContain("Eleg-hosszu-jelszo")
  })
})
