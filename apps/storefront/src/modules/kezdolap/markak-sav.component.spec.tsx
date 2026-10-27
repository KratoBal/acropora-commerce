import { cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: "hu" }),
  usePathname: () => "/hu",
}))
const data = vi.hoisted(() => ({ markaLista: vi.fn() }))
vi.mock("@lib/data/brands", () => data)
vi.mock("server-only", () => ({}))
/* a tobbi sav nem itt vizsgalt: jelolo elem */
const { jelolo } = vi.hoisted(() => ({
  jelolo: (nev: string) => ({ default: () => <i data-sav={nev} /> }),
}))
vi.mock("@modules/kezdolap/components/hero-csuszka", () => jelolo("hero"))
vi.mock("@modules/kezdolap/components/egyedi-korallok", () =>
  jelolo("egyedi-korallok"),
)

import Markak, { savMarkai, type SavMarka } from "./components/markak"
import { markaKinalat } from "./marka-kinalat"
import { KezdolapSavok } from "./savok"
import { szovegek } from "./szovegek"
import type { KezdolapTartalom } from "./tartalom"

/**
 * A MARKAK LOGOSAVJA (Balazs, 2026-10-27).
 *
 * MI PIROSIT: ha a sav sorrendje a bolte, nem az OS listajae; ha egy termek
 * nelkuli (a bolt kinalataban nem szereplo) marka helyet kap; ha a logo nem a
 * markaoldalra visz; ha a logo nem fekete-feher alapbol, vagy kurzor alatt nem
 * lesz szines; ha a masodik fel (a gorgetes diszlete) a felolvasonak vagy a
 * Tab-nak lathato; ha mozgas-csokkentesnel a sav mozog vagy a diszlet latszik;
 * ha egy veszelyes logo-cim (`javascript:`) kepkent a lapra jut; ha kijeloles
 * nelkul vagy a bolt hibajanal nem a nevek sora all; ha kijeloles nelkul is
 * lekerdezi a boltot.
 */
const marka = (handle: string, logo: string | null = null): SavMarka => ({
  name: `Név ${handle}`,
  handle,
  logo_url: logo,
})
const KINALAT = [
  marka("aquaforest", "https://cdn.example/aquaforest.png"),
  marka("fauna-marin", "https://cdn.example/fauna.svg"),
  marka("triton"),
]

const rekord = (
  featured_brand_handles: KezdolapTartalom["featured_brand_handles"],
): KezdolapTartalom => ({ texts: {}, slides: null, featured_brand_handles })

describe("a márkák logósávja", () => {
  afterEach(cleanup)
  /*
    NINCS beforeEach-es mockReset/mockClear: vitest 5.0.0 alatt utana egy dobo
    aszinkron implementacio a tesztet buktatja, akkor is, ha a hivo elkapja a
    hibat (mert 2026-10-27). A hivasszamot ezert a teszt a sajat kezdo
    ertekehez meri.
  */

  it("a sorrend az OS listájáé, a kínálatban nem szereplő márka kimarad", () => {
    expect(
      savMarkai(["triton", "nincs-termeke", "aquaforest"], KINALAT).map(
        (m) => m.handle,
      ),
    ).toEqual(["triton", "aquaforest"])
    expect(savMarkai(null, KINALAT)).toEqual([])
    expect(savMarkai([], KINALAT)).toEqual([])
    expect(savMarkai(undefined, KINALAT)).toEqual([])
  })

  it("minden valódi logó a márkaoldalra visz, a díszlet rejtett és nem fókuszálható", () => {
    render(<Markak s={szovegek(null)} markak={KINALAT} />)
    const sav = screen.getByTestId("marka-sav")
    const elemek = within(sav).getAllByRole("listitem", { hidden: true })
    // keves marka: a fel legalabb tiz logo, a sor ket fel
    expect(elemek.length).toBe(2 * 12)
    const valodi = elemek.filter((li) => !li.hasAttribute("aria-hidden"))
    expect(
      valodi.map((li) => li.querySelector("a")!.getAttribute("href")),
    ).toEqual([
      "/hu/marka/aquaforest",
      "/hu/marka/fauna-marin",
      "/hu/marka/triton",
    ])
    for (const li of elemek.filter((li) => li.hasAttribute("aria-hidden"))) {
      expect(li.querySelector("a")!.getAttribute("tabindex")).toBe("-1")
      expect(li.className).toContain("motion-reduce:hidden")
    }
    // a felolvaso csak a harom valodi linket latja
    expect(within(sav).getAllByRole("link").length).toBe(3)
  })

  it("a logó fekete-fehér, kurzor alatt színes; logó nélkül a név áll a linkben", () => {
    render(<Markak s={szovegek(null)} markak={KINALAT} />)
    const [aqua, fauna, triton] = screen
      .getAllByRole("link")
      .filter((a) => a.dataset.testid === "marka-logo")
    expect(aqua!.getAttribute("aria-label")).toBe("Név aquaforest")
    const kep = aqua!.querySelector("img")!
    expect(kep.getAttribute("src")).toBe("https://cdn.example/aquaforest.png")
    expect(kep.className).toMatch(/(^| )grayscale( |$)/)
    expect(kep.className).toContain("group-hover/logo:grayscale-0")
    expect(fauna!.querySelector("img")).toBeTruthy()
    expect(triton!.querySelector("img")).toBeNull()
    expect(triton!.textContent).toBe("Név triton")
  })

  it("a sáv lassan gördül, kurzor alatt megáll, mozgás-csökkentésnél áll", () => {
    render(<Markak s={szovegek(null)} markak={KINALAT} />)
    const lista = within(screen.getByTestId("marka-sav")).getByRole("list", {
      hidden: true,
    })
    expect(lista.className).toContain("animate-marka-sav")
    expect(lista.className).toContain("motion-reduce:animate-none")
    expect(lista.className).toContain(
      "group-hover/sav:[animation-play-state:paused]",
    )
    // 12 logo a felben, logonkent 4 mp
    expect(lista.style.animationDuration).toBe("48s")
  })

  it("veszélyes logó-cím nem lesz kép, a név áll a helyén", () => {
    render(
      <Markak
        s={szovegek(null)}
        markak={[marka("rossz", "javascript:alert(1)")]}
      />,
    )
    const [link] = screen
      .getAllByRole("link")
      .filter((a) => a.dataset.testid === "marka-logo")
    expect(link!.querySelector("img")).toBeNull()
    expect(link!.textContent).toBe("Név rossz")
  })

  it("márkák nélkül a régi sor: a nevek, sáv nincs", () => {
    render(<Markak s={szovegek(null)} />)
    expect(screen.queryByTestId("marka-sav")).toBeNull()
    expect(screen.getByTestId("markak").textContent).toContain("Fauna Marin")
  })

  it("a kezdőlap a kijelölt márkákat kéri a bolttól, és a sávot rajzolja", async () => {
    const elotte = data.markaLista.mock.calls.length
    data.markaLista.mockResolvedValue(KINALAT)
    const tartalom = rekord(["fauna-marin", "triton"])
    render(
      await KezdolapSavok({
        tartalom,
        countryCode: "hu",
        markak: await markaKinalat(tartalom),
      }),
    )
    expect(data.markaLista.mock.calls.length - elotte).toBe(1)
    const sav = screen.getByTestId("marka-sav")
    expect(
      within(sav)
        .getAllByRole("link")
        .map((a) => a.getAttribute("href")),
    ).toEqual(["/hu/marka/fauna-marin", "/hu/marka/triton"])
  })

  it("kijelölés nélkül nem kérdez, a bolt hibájánál a nevek sora áll, a lap nem bukik el", async () => {
    const elotte = data.markaLista.mock.calls.length
    for (const t of [null, rekord(null), rekord([])]) {
      cleanup()
      expect(await markaKinalat(t)).toEqual([])
      render(await KezdolapSavok({ tartalom: t, countryCode: "hu" }))
      expect(screen.queryByTestId("marka-sav")).toBeNull()
    }
    expect(data.markaLista.mock.calls.length).toBe(elotte)

    const figyelmeztet = vi.spyOn(console, "warn").mockImplementation(() => {})
    data.markaLista.mockImplementation(async () => {
      throw new Error("a bolt nem valaszol")
    })
    cleanup()
    const tartalom = rekord(["triton"])
    let kinalat: SavMarka[] = []
    try {
      kinalat = await markaKinalat(tartalom)
    } catch (e) {
      throw new Error("ESCAPED FROM markaKinalat " + String(e))
    }
    expect(kinalat).toEqual([])
    render(
      await KezdolapSavok({ tartalom, countryCode: "hu", markak: kinalat }),
    )
    expect(screen.queryByTestId("marka-sav")).toBeNull()
    expect(screen.getByTestId("markak")).toBeTruthy()
    expect(figyelmeztet).toHaveBeenCalled()
    figyelmeztet.mockRestore()
  })
})
