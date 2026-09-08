import { Heading, Text } from "@modules/common/components/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

/**
 * AZ ÜRES KOSÁR (Balázs terve, kosar-2026-09-07).
 *
 * A terv nem egy "üres" feliratot mutat, hanem HÁROM KIINDULÓPONTOT: az üres
 * kosár nem hibaállapot, hanem az a pillanat, amikor a vevő nem tudja, hol
 * kezdje.
 *
 * === AMIT A TERVBŐL NEM VETTÜNK ÁT, ÉS MIÉRT ===
 *
 * A tervben a korall-kártyán ez áll: „31 egyedi példány, saját fotóval". A
 * HARMINCEGY egy ÉLŐ SZÁM: a készlettől függ, és minden héten más. Beégetve
 * három nap múlva hazudna, és senki nem venné észre, mert egy szám nem hibázik.
 *
 * Amíg nincs bekötve a lekérdezés, ami megszámolja, a mondat a szám NÉLKÜL áll
 * itt. Ez a brief szabálya: ami megvan, valódi adattal álljon; ami nincs, ott ne
 * találjunk ki semmit.
 */
const AJANLOK = [
  {
    cim: "E heti WYSIWYG korallok",
    /** A darabszám szándékosan hiányzik: élő adat, lásd a fenti indokot. */
    leiras: "Egyedi példányok, saját fotóval · szerdán frissül",
    href: "/store",
  },
  {
    cim: "Technika",
    leiras: "Lámpa, szivattyú, lehabzó, méretezés-segéddel",
    href: "/store",
  },
  {
    cim: "Só, teszt, tápszer",
    leiras: "Amit havonta újra kell venni",
    href: "/store",
  },
] as const

const EmptyCartMessage = () => {
  return (
    <div
      className="py-16 px-2 flex flex-col items-start gap-8"
      data-testid="empty-cart-message"
    >
      <div className="flex flex-col gap-3 max-w-[36rem]">
        <span
          className="text-[10.5px] font-semibold uppercase tracking-wide"
          style={{ color: "var(--terv-szoveg-halvany)" }}
        >
          Üres kosár
        </span>
        <Heading level="h1" className="text-3xl-regular">
          A kosár még üres
        </Heading>
        <Text
          className="text-base-regular"
          style={{ fontFamily: "var(--terv-betu-kiemelt-lanc)" }}
        >
          Kezdd ott, ahol a legtöbben: a heti új korallpéldányoknál, vagy a
          technikánál, ha most építesz.
        </Text>
      </div>

      <div className="grid grid-cols-1 small:grid-cols-3 gap-4 w-full">
        {AJANLOK.map((ajanlo) => (
          <LocalizedClientLink
            key={ajanlo.cim}
            href={ajanlo.href}
            className="flex flex-col gap-2 p-4 border h-full"
            style={{
              borderColor: "var(--terv-keret-meleg)",
              background: "var(--terv-hatter-lap)",
            }}
            data-testid="empty-cart-ajanlo"
          >
            <span className="text-[15px] font-semibold">{ajanlo.cim}</span>
            <span
              className="text-[12.5px] leading-relaxed"
              style={{ color: "var(--terv-szoveg-halvany)" }}
            >
              {ajanlo.leiras}
            </span>
            <span
              className="mt-auto pt-2 text-[12.5px]"
              style={{ color: "var(--terv-kiemel-tinta)" }}
              aria-hidden="true"
            >
              Megnézem →
            </span>
          </LocalizedClientLink>
        ))}
      </div>

      {/*
        A TERV NEGYEDIK BLOKKJA. A szoveg es a telefonszam a terv sajat
        tartalma, tehat NEM talalt adat -- a bolt allitja magarol.
      */}
      <div
        className="p-4 border w-full"
        style={{
          borderColor: "var(--terv-keret-meleg)",
          background: "var(--terv-hatter-lap)",
        }}
      >
        <p className="text-[15px] font-semibold">Most kezdesz akváriumot?</p>
        <p
          className="text-[12.5px] leading-relaxed"
          style={{ color: "var(--terv-szoveg-halvany)" }}
        >
          Írd meg a méretet és a terveket, összeállítjuk a listát.{" "}
          <a href="tel:+36202676801" className="underline">
            +36 20 267 6801
          </a>
        </p>
      </div>
    </div>
  )
}

export default EmptyCartMessage
