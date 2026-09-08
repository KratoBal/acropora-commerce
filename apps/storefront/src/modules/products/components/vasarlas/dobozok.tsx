"use client"

import { Button } from "@modules/common/components/ui"
import OptionSelect from "@modules/products/components/product-actions/option-select"

import ProductPrice from "../product-price"
import StockState from "../stock-state"
import { useVasarlas } from "./kontextus"

/**
 * A NEGY VASARLASI DOBOZ, KULON-KULON -- A TERV SZERINT.
 *
 * A terv a jobb oszlopot negy dobozra bontja, es eddig mind a negy tartalma
 * EGY dobozban allt (a `mennyiseg` slotban), mert egyetlen komponens volt.
 * Az allapot most az `allapot.tsx`-ben lakik, tehat a negy doboz kulon
 * olvashatja ugyanazt -- a viselkedes valtozatlan.
 *
 * MINDEGYIK `null`-t ad provider nelkul, es ez SZANDEKOS: a vaz ilyenkor a
 * varakozo szoveget mutatja, ami a helyes valasz. A varrat merese nem itt van,
 * hanem a megepitett lapon.
 */

/** 6. doboz: AR. */
export function ArDoboz() {
  const a = useVasarlas()
  if (!a) return null
  return <ProductPrice product={a.product} variant={a.selectedVariant} />
}

/**
 * 7. doboz: ELERHETOSEG.
 *
 * A terv felirata "Keszlet, szallitas, bolti atvetel". Ebbol MA a keszlethez
 * kotodo ket teny letezik, es mind a ketto MAR MEGVOLT, csak rossz helyen:
 *
 *   a kiszereles (`Kiszereles: ...`)   eddig is itt allt, a `vazTartalom`-bol
 *   a minimalis rendelesi mennyiseg    eddig a GOMB ALATT, a 9. dobozban
 *
 * A szallitas es a bolti atvetel NEM letezik adatkent, tehat nem kerul ide
 * kitalalt sor.
 *
 * ES AMI SZANDEKOSAN NEM KERUL IDE: a keszlet-allapot SZOVEGE ("Kosarba",
 * "Nincs raktaron", "Eladva"). Azt a 9. doboz gombja MONDJA KI, ugyanabbol az
 * `availabilityLabel` terkepbol. Ha ide is kiirnank, ket allitas allna
 * ugyanarrol a lapon, es a ketto elcsuszasa NEM hibazna, csak mast mutatna --
 * ugyanaz az alak, amiert a ragados sav sem szamol sajat arat.
 */
export function ElerhetosegDoboz({
  kiszereles,
  rendelesiMondat,
}: {
  kiszereles?: string
  rendelesiMondat?: string | null
}) {
  /**
   * A MONDAT KESZEN ERKEZIK, ES EZ A VALTOZAS LENYEGE.
   *
   * Eddig a doboz a MINIMUM SZAMAT kapta, es maga fogalmazta meg a mondatot.
   * Harom parameter (minimum, lepeskoz, maximum) mellett ez azt jelentene,
   * hogy a szoveg KET helyen all: itt es a `product-actions/index.tsx`-ben --
   * es a ketto szet tudna csuszni ugy, hogy semmi nem hibazik, csak mast
   * mondanak ugyanarrol a termekrol.
   *
   * Ezert a szoveget az `orderQuantityHint` allitja elo, es a doboz csak
   * megjeleniti. A `null` tovabbra is azt jelenti, hogy nincs mit mondani.
   */
  const minimumSor = rendelesiMondat ? (
    /**
     * A RENDELESI MONDAT NEM CIMKE-ERTEK PAR, TEHAT NEM IS AZ LESZ.
     *
     * A tervbeli sorok mind ketreszuek (bal oldalt cimke, jobb oldalt ertek).
     * Ez egy MONDAT ("legalabb 2 darab rendelheto"), aminek nincs cimkeje. Ha
     * eroltetnenk ra egyet, kitalalt szoveg kerulne a lapra -- ezert teljes
     * szelessegben all a melyedesen belul.
     */
    <p
      className="text-[13.5px]"
      style={{ color: "var(--terv-szoveg-halvany)" }}
      data-testid="vaz-rendelesi-mondat"
    >
      {rendelesiMondat}
    </p>
  ) : null

  /**
   * TISZTA MEGJELENITES, KONTEXT NELKUL -- ES EZ SZANDEKOS.
   *
   * A masik harom doboz allapotot olvas; ez ketto TENYT, es mindketto a
   * termekbol szamolhato (`unas_unit`, `unas_minimum_order_quantity`). Ha
   * kontextbol venne oket, egy provider nelkuli lapon URESEN allna ugy, hogy a
   * vaz TELINEK jeloli -- rosszabb, mint a varakozas.
   */
  if (!kiszereles && !minimumSor) return null

  /**
   * A DOBOZ MELYEDES A PANELEN BELUL, ES EZ A TERVBOL MERT ALAK (2026-09-08).
   *
   * A terv sotet lapjan a keszlet-sor igy all:
   *
   *     margin-top:18px; padding:14px;
   *     background:oklch(0.17 0.016 250);
   *     display:flex; flex-direction:column; gap:6px
   *
   * es a benne allo sorok ketreszuek: `justify-content:space-between`,
   * 13,5 pixel, a cimke halvany, az ertek 600-as vastagsagu.
   *
   * A 0.17 a `--terv-hatter`, vagyis a LAP erteke -- a doboz tehat a panelbol
   * KIVAGOTT melyedes, nem egy rateett kartya. Uj token nem kellett hozza.
   * A `margin-top:18px` sem kerul ide: a kozos panel belso terkoze mar 18 pixel.
   *
   * === A KET VILAG ITT IS ELLENTETES IRANYBA MEGY, UGYANABBOL AZ OKBOL ===
   *
   * Sotetben a melyedes (0.17) SOTETEBB a panelnel (0.205). Vilagosban a
   * `--terv-hatter` 0.99, a panel 0.955, tehat VILAGOSABB lesz -- kiemelkedes,
   * nem melyedes. Nem javitjuk: a terv ket vilagos lapjan NINCS ilyen panel,
   * tehat nincs mihez igazodni, es egy kitalalt ertek tervbelinek latszana.
   *
   * === A CIMKE SZINE A MEGLEVO TOKEN, ES A KULONBSEG MERVE 0,02 ===
   *
   * A tervben a cimke `oklch(0.74 0.012 250)`, a tokenunk `oklch(0.72 ...)`.
   * A sotet tervlap HAT kulonbozo halvany szovegszint hasznal 0.68 es 0.74
   * kozott (13, 12, 9, 9, 7 es 6 elofordulassal). Hat ertek egy ilyen szuk
   * savban nem hat szerep, hanem a tervfajl zaja -- ezert a meglevo token megy
   * ide, nem egy uj a 0,02-ert.
   *
   * === ES AMI SZANDEKOSAN NEM KERUL IDE, VALTOZATLANUL ===
   *
   * A tervbeli harom sorbol ("Keszlet", "Eloallat-szallitas", "Bolti atvetel")
   * ma egyiknek sincs adata ilyen alakban. A szallitas es az atvetel nem
   * letezik adatkent, a keszlet SZOVEGET pedig a 9. doboz gombja mondja ki --
   * ha ide is kiirnank, ket allitas allna ugyanarrol. A melyedes tehat a
   * MEGLEVO ket tenyt kapja meg, uj sor nelkul.
   */
  /*
    A MELYEDES A LAP TOKENJET VISELI, ES A TERVBEN VAN EGY MASIK ERTEK IS --
    ez a mondat azert all itt, hogy ket het mulva ne kelljen ujra lemerni
    (acrobot merese, 2026-09-08).

    A 2a szakasz KET keretet tartalmaz, es a keszlet-sor MIND A KETTOBEN ott
    van, KULONBOZO hatterrel:

      a 1440 pixeles ASZTALI kereten belul   oklch(0.17 0.016 250)  <- ez all itt
      a  390 pixeles MOBIL   kereten belul   oklch(0.215 0.018 249)

    Nem ket VALTOZAT, hanem ugyanaz a lap ket MERETBEN: a mobil blokk sajat
    fejleccel indul, es ott az elhelyezes-seged GOMB, nem beagyazott doboz.

    Mi az asztali nezetet epitjuk, tehat a 0.17 -- es az a `--terv-hatter`,
    uj token nelkul. A 0.215 AKKOR kap tokent, amikor a mobil nezet epul, es
    AKKOR a szerepebol levezetve, nem ebbol az ertekbol visszafejtve.

    ES AMIERT A KET ERTEK GYANUT KELTETT: ellentetes iranyba emelnek ki. Az
    asztali a lap tonusara MELYIT (a panel 0.205-nel vilagosabb), a mobil
    fole EMEL (0.215 a 0.17-es lapon). Egy sima "ket ertek van" nem lett
    volna eleg gyanu ahhoz, hogy megnezzuk, miben kulonboznek.

    === ES EGY NYITOTT ELTERES A VILAGOS VILAGBAN, KIMONDVA ===

    Ez a doboz a `--terv-hatter`-t viseli, es a SOTET lapon ez BETURE pontos:
    ott a melyedes es a lap alapja UGYANAZ az ertek (mindketto 0.17). A
    vilagos lapon viszont NEM ugyanaz:

      2a  lap alapja  oklch(0.17 0.016 250)   doboz  oklch(0.17 0.016 250)
      1b  lap alapja  oklch(0.99 0.004 80)    doboz  oklch(0.965 0.008 70)

    (A dobozt az ALAKJA azonositja mind a ket lapon: `padding:14px` es
    `gap:6px` -- ugyanaz a ketto, amit ez a komponens visel.)

    Vagyis vilagosban a terv egy KULON, sotetebb erteket ad a doboznak, mi
    pedig a lap alapjat adjuk neki. A sotet lapon a ketto veletlenul egybeesik,
    es epp ezert nem latszik a hiba onmagaban.

    NEM JAVITOM, mert az uj token-ertek kerdese, nem elrendezes -- es mert a
    sotet oldal ma helyes. Merve 2026-09-08; ha valaki hozzanyul, ez a ket sor
    a kiindulas.
  */
  return (
    <div
      className="flex flex-col gap-[6px] p-[14px]"
      style={{ background: "var(--terv-hatter)" }}
      data-testid="elerhetoseg-melyedes"
    >
      {kiszereles ? (
        <div
          className="flex items-baseline justify-between gap-4 text-[13.5px]"
          data-testid="vaz-egyseg"
        >
          <span style={{ color: "var(--terv-szoveg-halvany)" }}>
            Kiszerelés
          </span>
          <span className="font-semibold">{kiszereles}</span>
        </div>
      ) : null}
      {minimumSor}
    </div>
  )
}

/**
 * 8. doboz: VALTOZAT-VALASZTO.
 *
 * A harom allapot (valodi valaszto / ott all de nem valaszthato / meg sem
 * jelenik) VALTOZATLAN, a `ProductActions` torzsebol kerult ide, betuhiven.
 * A ket feltetel indoka is valtozatlan, es a `product-actions/index.tsx`
 * fejlece orzi a teljes levezetest -- ide csak a rovid alak kerul, hogy a ket
 * peldany ne csusszon el egymastol.
 */
export function ValasztoDoboz() {
  const a = useVasarlas()
  if (!a) return null
  if (a.uniquePiece) return null
  if ((a.product.options?.length ?? 0) === 0) return null

  return (
    <div className="flex flex-col gap-y-4">
      {(a.product.options || []).map((option) => (
        <div key={option.id}>
          <OptionSelect
            option={option}
            current={a.options[option.id]}
            updateOption={a.setOptionValue}
            title={option.title ?? ""}
            data-testid="product-options"
            disabled={
              a.disabled || a.isAdding || (a.product.variants?.length ?? 0) <= 1
            }
          />
        </div>
      ))}
    </div>
  )
}

/**
 * 9. doboz: MENNYISEG ES KOSARBA TETEL.
 *
 * A lap alji sav (14. doboz) NEM ehhez meri magat: az a sav `sticky`, es a
 * gombja UGRIK ide (`#vaz-mennyiseg`), nem onallo kosarba-tetel. Ezert itt
 * nincs `ref` es nincs lathatosag-figyelo -- a regi lap lebego sávja az, ami
 * ilyet igenyelt, es az a `ProductActions`-ben maradt, a regi uton.
 */
/**
 * A LEPTETO MERETEI -- A TERV 1b LAPJAROL MERVE, EGY HELYEN.
 *
 * A magassag SZANDEKOSAN azonos a fo gomb magassagaval (`FO_GOMB_MERET`):
 * a tervben a ket elem egy sorban all, es egy vonalban zar. Ha valaki az
 * egyiket elmozditja, a masikat is mozditania kell -- ezert all a ket szam
 * egymas mellett a fejlecben, nem szet szorva a jelolesben.
 */
export const LEPTETO_GOMB_MERET = "h-[54px] w-[42px] text-lg"
export const LEPTETO_MEZO_MERET = "h-[54px] w-[34px] text-[15px]"

export function MennyisegDoboz() {
  const a = useVasarlas()
  if (!a) return null

  if (!a.selectedVariant) {
    return (
      <div>
        <Button
          disabled
          variant="primary"
          className="w-full h-10"
          data-testid="add-product-button"
        >
          Válassz változatot
        </Button>
      </div>
    )
  }

  /*
    A LEPTETO A TERV MERETET VESZI FEL (31183035 negyedik tetele).

    === A MERES, ES HOGY MELYIK LAPON ALL ===

    A lepteto CSAK az 1b (vilagos, lampa) lapon letezik. A 2a (sotet, korall)
    lapon nincs, es ez NEM hiany: egy egyedi peldanybol egy darab van, tehat
    ott nincs mit lepteni. A mi felteteliink (`!a.uniquePiece`) pontosan ezt
    a kulonbseget rajzolja ki, tehat a szerkezet mar egyezett -- csak a
    meretek nem.

        sor       display:flex; gap:10px      (a gomb-sor koze)
        keret     1px solid oklch(0.85 0.008 70)
        - es +    width:42px; height:54px; font-size:18px
        a szam    width:34px; JetBrains Mono; font-size:15px

    === AMIT ATVESZEK, ES AMIT NEM ===

    A GEOMETRIAT atveszem: az 54 a gomb magassaga mellett all, ugyanabban a
    sorban, tehat a ket elem egy vonalban zar. A 42 es a 34 ugyanezt a sort
    tolti ki.

    A SZINEKET NEM. Ket okbol, es a masodik a fontosabb:

    1. A mert ertekek (`oklch(0.85 0.008 70)` keret, `oklch(0.45 0.012 60)`
       jel) kozel allnak a meglevo tokenekhez (`--terv-keret-meleg` vilagos
       0.88, `--terv-szoveg-halvany` vilagos 0.5), de nem egyeznek beture.
    2. ES CSAK EGY VILAGRA VANNAK MERVE. A sotet lapon nincs lepteto, tehat
       a sotet ertekre NINCS meresem. Egy egy-vilagra mert szin beirasa
       ugyanaz a hiba lenne, mint amit a rez-tokeneknel mar egyszer
       elkovettunk: a sotet lapon mert keszlet atkerult a vilagosra is.

    A keret ezert a keszlet sajat tokenjén marad, amig valaki a sotet
    ertekre is ad merest, vagy kimondja, hogy a meglevo token a valasz.

    A MONO BETU KIVETEL, es azert az: a `--terv-betu-mono-lanc` MINDKET
    vilagban ugyanaz (a betukeszlet nem vilagfuggo), tehat ott nincs mit
    kitalalni.
  */
  return (
    <div className="flex gap-[10px]">
      {!a.uniquePiece && (
        <div className="flex items-center rounded-md border border-ui-border-base">
          <button
            type="button"
            aria-label="Mennyiség csökkentése"
            className={`${LEPTETO_GOMB_MERET} focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-fg-interactive`}
            onClick={() =>
              a.setQuantity(a.normaliseQuantity(a.quantity - a.quantityStep))
            }
          >
            −
          </button>
          <input
            aria-label="Mennyiség"
            className={`${LEPTETO_MEZO_MERET} bg-transparent text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-fg-interactive`}
            style={{ fontFamily: "var(--terv-betu-mono-lanc)" }}
            inputMode="numeric"
            value={a.quantity}
            onChange={(event) =>
              a.setQuantity(a.normaliseQuantity(Number(event.target.value)))
            }
            onBlur={() => a.setQuantity(a.normaliseQuantity(a.quantity))}
          />
          <button
            type="button"
            aria-label="Mennyiség növelése"
            className={`${LEPTETO_GOMB_MERET} focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-fg-interactive`}
            onClick={() =>
              a.setQuantity(a.normaliseQuantity(a.quantity + a.quantityStep))
            }
            disabled={!a.novelheto}
          >
            +
          </button>
        </div>
      )}
      <StockState
        availability={a.availability}
        similarHref={a.similarHref}
        onAddToCart={a.handleAddToCart}
        isAdding={a.isAdding}
        disabled={a.disabled || a.isAdding}
      />
    </div>
  )
}
