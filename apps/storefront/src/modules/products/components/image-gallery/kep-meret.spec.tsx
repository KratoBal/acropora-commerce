import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import ImageGallery from "./index"
import { KepBlokk } from "./kep-blokk"
import { TovabbiKepek } from "./kep-meret"

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
  /**
   * A SOR A TELJES KESZLETET MUTATJA, NEM A MARADEKOT.
   *
   * 2026-09-09-ig a sor a nagy kep NELKULI maradekot mutatta (haromnal
   * kettot). A tervlapon a sorban HAT csempe all, es az ELSO 2 pixeles rez
   * keretet visel -- vagyis a sor a TELJES keszlet, es a kivalasztott meg van
   * jelolve benne.
   *
   * Egy csempe, ami eltunik, amikor ranyomsz, a valasztast is elrejti.
   */
  it("három képnél a sor mind a hármat mutatja", () => {
    const { container } = render(
      <ImageGallery images={[kep(1), kep(2), kep(3)] as never} />,
    )

    expect(container.querySelectorAll('[data-testid="nagy-kep"]')).toHaveLength(
      1,
    )
    expect(
      container.querySelectorAll('[data-testid="tovabbi-kep"]'),
    ).toHaveLength(3)
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
   * === MIERT OSZTALYRA MERUNK, ES NEM BEAGYAZOTT STILUSRA (2026-09-09) ===
   *
   * Az arany 2026-09-09 ota TORESPONT-FUGGO (telefonon negyzetes), es egy
   * beagyazott `style` nem ismer torespontot. A jsdom sem szamol media
   * lekerdezest, tehat a KIRAJZOLT aranyt itt egyik alakban sem lehetne
   * merni -- amit merni lehet, az a JELOLES, es abbol most tobb latszik,
   * nem kevesebb: a ket meret ket kulon osztalyban all.
   */
  it("a nagy kép asztalin 16:10", () => {
    const { container } = render(<ImageGallery images={[kep(1)] as never} />)

    const doboz = container.querySelector(
      '[data-testid="nagy-kep"]',
    ) as HTMLElement | null

    expect(doboz).toBeTruthy()
    expect(doboz!.className).toContain("lg:aspect-[16/10]")
    expect(doboz!.className).toContain("w-full")
  })

  /**
   * ES TELEFONON NEGYZETES -- KULON ALLITAS, MERT KULON ERTEK.
   *
   * A tervlap mobil kerete `aspect-ratio:1` erteket ad. Ha ez es az asztali
   * arany EGY allitasban allna, az egyik elvesztese eszrevetlen maradhatna:
   * a masik fele ugyanugy zolden tartana a nevet.
   */
  it("a nagy kép telefonon négyzetes", () => {
    const { container } = render(<ImageGallery images={[kep(1)] as never} />)

    const doboz = container.querySelector(
      '[data-testid="nagy-kep"]',
    ) as HTMLElement | null

    expect(doboz!.className).toContain("aspect-square")
  })

  /**
   * ES A SZELESSEG NINCS KORLATOZVA. Ez a harmadik fuggetlen ertek: az elso
   * valtozatom egy 452 pixeles maximumot tett a fotora, es a ket arany-allitas
   * azt nem venne eszre.
   */
  it("a nagy képnek nincs szélesség-korlátja", () => {
    const { container } = render(<ImageGallery images={[kep(1)] as never} />)

    const doboz = container.querySelector(
      '[data-testid="nagy-kep"]',
    ) as HTMLElement | null

    expect(doboz!.style.maxWidth).toBe("")
    expect(doboz!.style.width).toBe("")
  })

  /**
   * ES A MASIK KEP-UT UGYANEZT A KET ARANYT VISELI.
   *
   * A ket ut kulon megjelenitovel dolgozik, tehat kulon is elcsuszhat --
   * a `contain` modnal egyszer mar szet is csusztak.
   */
  it("a másik kép-út ugyanezt a két arányt viseli", () => {
    const { container } = render(<KepBlokk kepek={[kep(1)]} alt="teszt" />)

    const img = container.querySelector(
      '[data-testid="vaz-foto"]',
    ) as HTMLElement | null

    expect(img).toBeTruthy()
    expect(img!.className).toContain("aspect-square")
    expect(img!.className).toContain("lg:aspect-[16/10]")
  })

  /**
   * A SOR CSEREL: KATTINTASRA A KIVALASZTOTT KEP KERUL FOLULRE.
   *
   * Ez az allitas a KARTYA targya (`1fa28d5b`): a sor 2026-09-09-ig HOLT volt
   * -- nulla `onClick`, nulla `button` --, ugyanazon a napon, amikor
   * megepitettem. Egy sor, ami kattinthatonak LATSZIK es nem az, rosszabb,
   * mint a hianya.
   *
   * A MERES A NAGY KEP FORRASARA MEGY, nem a csempere: azt akarjuk tudni, hogy
   * a valasztas ATERT a nagy kepre, nem azt, hogy a gomb megkapta a fokuszt.
   */
  it("a sorra kattintva a nagy kép a választott fotóra vált", () => {
    const { container } = render(
      <ImageGallery images={[kep(1), kep(2), kep(3)] as never} />,
    )

    const nagyForras = () =>
      container
        .querySelector('[data-testid="nagy-kep"] img')
        ?.getAttribute("src") ?? ""

    /* ISMERT POZITIV KONTROLL: indulaskor az ELSO kep all folul. */
    expect(nagyForras()).toContain("k1")

    const gombok = container.querySelectorAll<HTMLElement>(
      '[data-testid="tovabbi-kep-gomb"]',
    )
    expect(gombok).toHaveLength(3)

    /*
      `fireEvent` es nem `.click()`: a React ujrarendereles az `act` hataran
      belul fut le. A nyers DOM-hivas eltuzeli az esemenyt, de az allitas
      MEG A REGI fan futna -- elso valtozatomban epp ez tortent, es a piros a
      merohely hatarat mutatta, nem a kodet.
    */
    fireEvent.click(gombok[2])

    expect(nagyForras()).toContain("k3")
  })

  /**
   * ES A KIVALASZTOTT CSEMPE MEG VAN JELOLVE -- A TERV EZT KIRAJZOLJA.
   *
   * A tervlapon az elso csempe `border:2px solid <rez>` erteket visel. A
   * jeloles nelkul a vevo nem latja, melyik kepet nezi eppen.
   *
   * A jeloles KET csatornan all: a keret (latas) es az `aria-current`
   * (felolvaso). A masodik nelkul a valasztas csak vizualis lenne -- ugyanaz a
   * hiba, amit ma a ful-savnal kerestunk, es ott szerencsere nem talaltunk.
   */
  it("a kiválasztott csempe jelölve van, látásra és felolvasónak is", () => {
    const { container } = render(
      <ImageGallery images={[kep(1), kep(2)] as never} />,
    )

    const gombok = container.querySelectorAll<HTMLElement>(
      '[data-testid="tovabbi-kep-gomb"]',
    )

    expect(gombok[0].style.border).toContain("2px")
    expect(gombok[0].style.border).toContain("var(--terv-kiemel)")
    expect(gombok[0].getAttribute("aria-current")).toBe("true")

    expect(gombok[1].style.border).not.toContain("2px")
    expect(gombok[1].getAttribute("aria-current")).toBeNull()
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

    /*
      A TAGADAS MOSTANTOL TAGABB, ES EZ EDDIG NEM VOLT MEGIRHATO.

      Korabban csak a `bg-ui-` elotagot tiltottuk -- a `bg-white`-ot NEM latta.
      Kiterjeszteni viszont nem lehetett, mert a doboz a kozos `Container`
      komponenst hasznalta, ami BEEGETVE viszi a `bg-white rounded-lg p-4`
      osztalyokat: egy tagabb tagadas AZONNAL pirosat adott volna egy helyes
      fan.

      A `Container` kicserelese sima `div`-re ezt a korlatot szuntette meg --
      vagyis a valtozas nem csak egy lekerekitest vett le, hanem MERHETOVE
      tette azt, amit eddig csak kartyan lehetett szamon tartani (`c9d3cec8`).
    */
    expect(doboz!.className).not.toMatch(/\bbg-(ui-|white|gray-|neutral-)/)
  })

  /**
   * A FOTO SARKA NEM LEKEREKITETT.
   *
   * A tervlapon a foto doboza `position:relative; aspect-ratio:16/10;
   * background:...` -- lekerekites NINCS rajta. Nalunk a kozos `Container`
   * hozta be a `rounded-lg` osztalyt, es a kitelepitett lapon merve 8 pixeles
   * `border-radius` allt a foton.
   *
   * Ez a lekerekites LATSZIK, ellentetben a masik ket Container-osztallyal
   * (`p-4`, `bg-white`), amiket a `fill` modu kep, illetve a beagyazott
   * hatter semlegesített.
   */
  it("a nagy kép doboza nem lekerekített", () => {
    const { container } = render(<ImageGallery images={[kep(1)] as never} />)

    const doboz = container.querySelector(
      '[data-testid="nagy-kep"]',
    ) as HTMLElement | null

    expect(doboz!.className).not.toMatch(/\brounded/)
    expect(doboz!.className).not.toMatch(/\bp-4\b/)
  })

  /**
   * ES A MASIK KEP-UT UGYANEZT A MODOT HASZNALJA.
   *
   * A `lap-vaz/valodi-tartalom.tsx` `Foto` komponense MAR `contain`-t hasznalt,
   * amikor a galeria meg `cover`-t. A ket ut EDDIG NEM EGYEZETT, es csak az
   * egyik hordozta a dontest -- ez az allitas azt orzi, hogy ne csusszanak
   * megint szet.
   *
   * === MIERT RENDERELES, ES NEM FORRAS-OLVASAS (2026-09-09) ===
   *
   * Ez az allitas korabban a `valodi-tartalom.tsx` SZOVEGET olvasta, mert a
   * mod egy szerver komponensben allt, es a ket utat egy rendereles nem hozta
   * ossze. Amikor a masik ut kep-blokkja kulon KLIENS komponensbe kerult
   * (`KepBlokk`), a mod egy renderelheto helyre kerult -- es a szoveg-olvaso
   * allitas AZONNAL pirosra ment, mert a keresett sorok mar nem ott alltak.
   *
   * A piros HELYES volt: a kod tenyleg elmozdult. De a tanulsag nem az, hogy
   * at kell irni a fajlnevet, hanem hogy a szoveg-olvasas addig indokolt, amig
   * NINCS renderelheto hely. Amint van, az a merce -- az nem a fajl
   * elhelyezeserol szol, hanem a viselkedesrol.
   */
  it("a másik kép-út ugyanezt a módot használja", () => {
    const { container } = render(<KepBlokk kepek={[kep(1)]} alt="teszt" />)

    const img = container.querySelector(
      '[data-testid="vaz-foto"]',
    ) as HTMLElement | null

    /* ISMERT POZITIV KONTROLL: tenyleg a masik ut nagy kepet fogtuk meg. */
    expect(img).toBeTruthy()

    expect(img!.style.objectFit).toBe("contain")
    expect(img!.style.objectFit).not.toBe("cover")
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

/**
 * A MASIK KEP-UT: A MUSZAKI LAPOK BLOKKJA.
 *
 * Balazs kerese (2026-09-09 16:37) NEM a galeriara szolt kulon: "A kis kepek
 * ott vannak a nagy kep alatt a termekeknel de nem kattinthato." A galeria
 * ut ugyanaznap megkapta a kattinthatosagot -- ez az ut nem, es a sor
 * ATTOL FUGGETLENUL OTT ALLT. Merve a teszt bolton: a `vaz-foto-blokk`
 * sor 23 termeken lathato negyvennyolcbol, es `tovabbi-kep-gomb` NULLA
 * volt mindegyiken.
 *
 * Egy sor, ami kattinthatonak LATSZIK es nem az, rosszabb, mint a hianya --
 * ugyanaz a mondat, mint a galeria oldalan, es pontosan ezert kell KET
 * helyen allitas: a ket ut kulon romolhat el, ahogy a `contain` modnal mar
 * egyszer szet is csusztak.
 */
describe("a műszaki lapok kép-blokkja", () => {
  /**
   * A KATTINTAS VALTOZTAT -- ES AZ ALLITAS A NAGY KEP FORRASARA MER.
   *
   * Nem arra, hogy letezik egy kezelo: egy `onClick`, ami nem valt kepet,
   * ugyanugy atmenne egy kezelo-letet mero allitason.
   */
  it("a sorra kattintva a nagy kép a választott fotóra vált", () => {
    const { container } = render(
      <KepBlokk kepek={[kep(1), kep(2), kep(3)]} alt="teszt" />,
    )

    const nagyForras = () =>
      container
        .querySelector('[data-testid="vaz-foto"]')
        ?.getAttribute("src") ?? ""

    /* ISMERT POZITIV KONTROLL: indulaskor az ELSO kep all folul. */
    expect(nagyForras()).toContain("k1")

    const gombok = container.querySelectorAll<HTMLElement>(
      '[data-testid="tovabbi-kep-gomb"]',
    )
    expect(gombok).toHaveLength(3)

    fireEvent.click(gombok[2])

    expect(nagyForras()).toContain("k3")
  })

  /**
   * EGYETLEN KEPNEL ITT SINCS SOR. Ket okbol all kulon a galeria ugyanilyen
   * allitasatol: mas komponens, es a `Foto` egy MASIK listat ad at neki (a
   * bolyegkeppel osszefuzve), tehat az egy-elemuseg mas helyen dolhet el.
   */
  it("egyetlen képnél nincs sor", () => {
    render(<KepBlokk kepek={[kep(1)]} alt="teszt" />)

    expect(screen.queryByTestId("tovabbi-kepek")).toBeNull()
    expect(screen.queryByTestId("vaz-foto")).toBeTruthy()
  })

  /**
   * URL NELKULI KEP NEM SZAMIT KEPNEK. A Medusa valasza ad `images` elemet
   * ures `url`-lel; ha azt beszamitanank, egy egykepes termek ketcsempes
   * sort kapna, es a masodik csempe egy nem letezo kepre mutatna.
   */
  it("url nélküli kép nem számít képnek", () => {
    render(<KepBlokk kepek={[kep(1), { id: "ures", url: null }]} alt="teszt" />)

    expect(screen.queryByTestId("tovabbi-kepek")).toBeNull()
  })

  it("kép nélkül semmit nem rajzol", () => {
    const { container } = render(<KepBlokk kepek={[]} alt="teszt" />)

    expect(container.innerHTML).toBe("")
  })
})
