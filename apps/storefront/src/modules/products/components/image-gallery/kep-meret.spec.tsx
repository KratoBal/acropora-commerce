import { readFileSync } from "node:fs"
import { join } from "node:path"

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import ImageGallery from "./index"
import { KEP_ARANY, TovabbiKepek } from "./kep-meret"

vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: "hu" }),
}))

afterEach(cleanup)

const kep = (i: number) => ({ id: `k${i}`, url: `https://pelda/k${i}.jpg` })

/**
 * A KEP-BLOKK KET IRANYA.
 *
 * Balazs kerese ket dolog egyszerre: a nagy kep legyen KISEBB, es a TOBBI kep
 * kerüljon ala, kicsiben. A ketto kulon romolhat el, ezert kulon allitas meri
 * oket -- es a "tobbi kep" iranyahoz kell egy egy-kepes eset is, kulonben az
 * allitas nem tudna, mit jelent az, hogy nincs sor.
 */
describe("a nagy kép kisebb, a többi alatta", () => {
  it("három képnél egy nagy áll, és kettő a sorban", () => {
    render(<ImageGallery images={[kep(1), kep(2), kep(3)] as never} />)

    expect(screen.getAllByTestId("tovabbi-kep")).toHaveLength(2)
  })

  /**
   * EGYETLEN KEPNEL NINCS SOR, es ez nem elmeleti eset: a teszt bolton merve
   * szaz termekbol HATVANEGYNEK pontosan egy kepe van. Egy ures, de meglevo
   * sav a termekek tobbsegen foglalna helyet.
   */
  it("egyetlen képnél nincs sor", () => {
    render(<ImageGallery images={[kep(1)] as never} />)

    expect(screen.queryByTestId("tovabbi-kepek")).toBeNull()
  })

  it("üres listára a sor semmit nem rajzol", () => {
    render(<TovabbiKepek kepek={[]} />)

    expect(screen.queryByTestId("tovabbi-kepek")).toBeNull()
  })

  /**
   * A NAGY KEP ARANYA A TERVLAPROL JON, ES A SZELESSEGE NINCS KORLATOZVA.
   *
   * A tervlapon a foto KITOLTI a bal oszlopot, es 16:10 all rajta kiirva. Az
   * elso valtozatom egy 452 pixeles maximumot tett ra -- azt ez az allitas
   * fogja meg, ha valaha visszakerulne.
   *
   * jsdom nem szamol elrendezest, tehat a MODOT merjuk (arany plusz teljes
   * szelesseg), nem a kirajzolt pixelt.
   */
  it("a nagy kép 16:10, és nincs szélesség-korlátja", () => {
    const { container } = render(<ImageGallery images={[kep(1)] as never} />)

    const doboz = container.querySelector(
      '[data-testid="nagy-kep"]',
    ) as HTMLElement | null

    expect(doboz).toBeTruthy()
    expect(doboz!.style.aspectRatio.replace(/\s/g, "")).toBe(
      KEP_ARANY.replace(/\s/g, ""),
    )
    expect(doboz!.style.maxWidth).toBe("")
    expect(doboz!.style.width).toBe("")
    expect(doboz!.className).toContain("w-full")
  })

  /**
   * A TELJES FOTO LATSZIK -- AZ ALLITAS A MODRA MER, NEM PIXELRE.
   *
   * Balazs dontese (2026-09-09, harom felkinalt ut kozul a (b)): a `cover`
   * kivagas a mert korall-fotokbol a magassag 38 / 38 / 38 / 17 / 17 / 10
   * szazalekat vette volna el, es a lapunkon ott all a mondat, hogy "a foto
   * pontosan ezt a peldanyt mutatja".
   *
   * A TAGADAS IS KELL: a `cover` visszairasa a meglet-allitast nem sertene, ha
   * valaki mind a kettot ott hagyja -- akkor a kesobbi ertek nyerne, es a
   * teszt hallgatna.
   */
  it("a nagy kép TELJESEN látszik, nem 16:10-re vágva", () => {
    const { container } = render(<ImageGallery images={[kep(1)] as never} />)

    const img = container.querySelector(
      '[data-testid="nagy-kep"] img',
    ) as HTMLElement | null

    expect(img).toBeTruthy()
    expect(img!.style.objectFit).toBe("contain")
    expect(img!.style.objectFit).not.toBe("cover")
  })

  /**
   * ES A SAV, AMI `contain` MELLETT MARAD, A LAP FOLDJET VISELI.
   *
   * Ha az a sav rogzitett szinu, a SOTET lapon vilagos csik allna a foto ket
   * oldalan, es a kep elrontottnak latszana -- holott csak kisebb. Itt
   * korabban `bg-ui-bg-subtle` allt, ami a Medusa rogzitett tokenje, es nem
   * ismeri a `data-vilag` kapcsolot.
   *
   * A jsdom nem oldja fel a valtozot: ez a token NEVET meri, nem a festett
   * szint. Amit bizonyit: a doboz nem visel rogzitett hatteret.
   */
  it("a kép doboza a lap földjét viseli, nem rögzített szürkét", () => {
    const { container } = render(<ImageGallery images={[kep(1)] as never} />)

    const doboz = container.querySelector(
      '[data-testid="nagy-kep"]',
    ) as HTMLElement | null

    expect(doboz!.style.background).toBe("var(--terv-hatter)")
    expect(doboz!.className).not.toContain("bg-ui-")
  })

  /**
   * ES A MASIK KEP-UT UGYANEZT A MODOT HASZNALJA.
   *
   * A `lap-vaz/valodi-tartalom.tsx` `Foto` komponense MAR `contain`-t hasznalt,
   * amikor a galeria meg `cover`-t. A ket ut EDDIG NEM EGYEZETT, es csak az
   * egyik hordozta a dontest -- ez az allitas azt orzi, hogy ne csusszanak
   * megint szet.
   *
   * A FORRAS SZOVEGET olvassa, mert a ket komponens kulon fajlban all, es egy
   * kozos rendereles nem hozna ossze oket. A megjegyzeseket kiszedjuk: a
   * fenti magyarazat SZO SZERINT idezi mind a ket modot.
   */
  it("a másik kép-út ugyanezt a módot használja", () => {
    const kodSzoveg = (szoveg: string) =>
      szoveg.replace(/\/\*[\s\S]*?\*\//g, "")

    const masik = kodSzoveg(
      readFileSync(
        join(__dirname, "..", "lap-vaz", "valodi-tartalom.tsx"),
        "utf-8",
      ),
    )

    /* ISMERT POZITIV KONTROLL: tenyleg a kep-utat olvastuk be. */
    expect(masik).toContain('data-testid="vaz-foto"')

    expect(masik).toContain('objectFit: "contain"')
    expect(masik).not.toContain('objectFit: "cover"')
  })

  /**
   * A SOR A TERVLAP SZERINT HAT OSZLOPOS ASZTALON, ES HAROM TELEFONON.
   *
   * A hat a tervlapon all (hat csempe egy sorban). A harom az en dontesem: hat
   * csempe egy 375 pixeles telefonon egyenkent 55 pixel lenne, es azon a
   * kepbol nem latszik semmi. A sor tehat nem gorget es nem zsugorodik
   * olvashatatlanra, hanem kevesebb oszlopot hasznal.
   */
  it("a sor hat oszlopos asztalon, három telefonon", () => {
    render(<ImageGallery images={[kep(1), kep(2)] as never} />)

    const sor = screen.getByTestId("tovabbi-kepek")

    expect(sor.className).toContain("lg:grid-cols-6")
    expect(sor.className).toContain("grid-cols-3")
  })
})
